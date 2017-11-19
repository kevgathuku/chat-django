var $chatWindow = $('#messages');
var accessManager;
var chatClient;
var cityChannel;
var username;
// var userLocation;
var city;

function positionFound(position) {
  document.getElementById('lat').value = position.coords.latitude;
  document.getElementById('long').value = position.coords.longitude;
  mapAndChat();
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(positionFound);
} else {
  alert('It appears that required geolocation is not enabled in your browser.');
}

// creates the map based on user's browser location
function drawMap() {
  let mapCanvas = document.getElementById('map');
  let latLng = new google.maps.LatLng(
    document.getElementById('lat').value,
    document.getElementById('long').value
  );

  let mapOptions = {
    center: latLng,
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  let map = new google.maps.Map(mapCanvas, mapOptions);
  let marker = new google.maps.Marker({
    position: latLng,
    map: map,
    title: 'Your location'
  });
}

function chatBasedOnCity() {
  let latitude = $('#lat').val();
  let longitude = $('#long').val();
  $.getJSON(
    'https://maps.googleapis.com/maps/api/geocode/json?latlng=' +
      latitude +
      ',' +
      longitude +
      '&sensor=true',
    {},
    function(locationData) {
      userLocation = locationData.results[0]['formatted_address'];
      username = userLocation.replace(/\s/g, '_');
      city = locationData.results[0].address_components[3].long_name;
      createChat(userLocation);
    }
  );
}

function createChat(location) {
  $.getJSON(
    '/token',
    {
      identity: username,
      device: 'browser'
    },
    function(data) {
      print(`It looks like you are near: ${location}`, true);

      // Initialize the Chat client
      chatClient = new Twilio.Chat.Client(data.token);
      chatClient.getSubscribedChannels().then(createOrJoinCityChannel);
    }
  );
}

function createOrJoinCityChannel() {
  // Get the chat channel for this city
  print(`Attempting to join ${city} chat channel...`);
  let promise = chatClient.getChannelByUniqueName(city);
  promise
    .then(function(channel) {
      cityChannel = channel;
      console.log('Found city channel:');
      console.log(cityChannel);
      setupChannel();
    })
    .catch(function() {
      // If it doesn't exist, let's create it
      console.log(`Creating ${city} channel`);
      chatClient
        .createChannel({ uniqueName: city, friendlyName: city })
        .then(function(channel) {
          console.log(`Created channel: `, channel);
          cityChannel = channel;
          setupChannel();
        });
    });
}

function setupChannel() {
  // Join the general channel
  cityChannel.join().then(function(channel) {
    print(`Joined channel ${channel.uniqueName} as ${username}`, true);
  });
  // Listen for new messages sent to the channel
  cityChannel.on('messageAdded', function(message) {
    printMessage(message.author, message.body);
  });
}

// Send a new message to the general channel
var $input = $('#chat-input');
$input.on('keydown', function(e) {
  if (e.keyCode == 13 && cityChannel) {
    cityChannel.sendMessage($input.val());
    $input.val('');
  }
});

function mapAndChat() {
  drawMap();
  chatBasedOnCity();
}

function print(infoMessage, asHtml) {
  var $msg = $('');
  if (asHtml) {
    $msg.html(infoMessage);
  } else {
    $msg.text(infoMessage);
  }
  $chatWindow.append($msg);
}

function printMessage(fromUser, message) {
  let $user = $('<span class="username">').text(fromUser + ':');
  if (fromUser === username) {
    $user.addClass('me');
  }
  let $message = $('<span class="message">').text(message);
  let $container = $('<div class="message-container">');
  $container.append($user).append($message);
  $chatWindow.append($container);
  $chatWindow.scrollTop($chatWindow[0].scrollHeight);
}
