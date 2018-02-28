const drawingStyles = {
    'freehand':1,
    'marker':2
}
var poly;
var map;
var existingPolylinePath;
var tempPoly;
var fidelity;
var lastpointpoly;
var pathLength;
var mapStatus;
var fidelityShow;
var pathResults;
var fidelityValue;
var drawStyle = drawingStyles.freehand;
var markerList = [];
var directionsService,
    directionsDisplay;

function initMap() {
  const mapStyle = [{
      "featureType": "poi",
      "elementType": "labels.icon",
      "stylers": [{
        "visibility": "off"
      }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text",
      "stylers": [{
        "visibility": "off"
      }]
    },
    {
      "featureType": "transit",
      "stylers": [{
        "visibility": "off"
      }]
    }
  ];

  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true
    });
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 16,
    styles: mapStyle,
    center: {
      lat: 37.56569,
      lng: 22.8
    } // Center the map on Nafplio, Greece.,
  });
  poly = new google.maps.Polyline({
    strokeColor: '#000000',
    strokeOpacity: 1,
    strokeWeight: 3,
    map: map,
    clickable: false
  });
  lastpointpoly = new google.maps.Polyline({
    strokeColor: '#FF0000',
    strokeOpacity: 0.5,
    strokeWeight: 6,
    map: map,
    clickable: false
  })
  // Add a listener for the click event
  map.addListener('click', handleMapClick);
    
  fidelity = document.querySelector('#fidelity');
  pathLength = document.querySelector('#path-length');
  mapStatus = document.querySelector('#map-status');
  pathResults = document.querySelector('#path-results');
  fidelityShow = document.querySelector('#fidelity-show');
    
  fidelity.addEventListener('input', function() {
    fidelityShow.textContent = (+this.value).toFixed(1);
    fidelityValue = +fidelity.value;
  });

  document.querySelector('#go-to').addEventListener('click', function(e) {
    const lat = document.querySelector('#go-lat').value,
      lng = document.querySelector('#go-lng').value;
    stopDrawing();
    map.setCenter({
      lat: +lat,
      lng: +lng
    });
  });
    
    document.querySelector('#clear').addEventListener('click', function(e) {
        poly.getPath().clear();
        lastpointpoly.getPath().clear();
        stopDrawing();
    
        markerList.forEach(function(marker){
            marker.setMap(null);
        })
        markerList= [];
        updateMarkers();
        
        removeDirections();
    });
    
  document.querySelector('#save').addEventListener('click', function(e) {
      let points, jsonPoints;
    stopDrawing();
      
    switch (drawStyle){
        case drawingStyles.freehand:
            points = poly
              .getPath()
              .getArray()
              .map(p => ({
                lat: p.lat(),
                lng: p.lng()
              }));
            break;
        case drawingStyles.marker:
            points = [];
            directionsDisplay.directions.routes[0].legs.forEach(function(leg){
                leg.steps.forEach(function(step){
                    points.push(...step.lat_lngs);
                })
            })
            break;
        default:
            break;
    }
    console.log(points);
    jsonPoints = JSON.stringify(points);
    pathResults.value = jsonPoints;
  })
    
    
  document.querySelector('#get-directions').addEventListener('click', function(e) {
      const directionsRequest = {
          origin: markerList.slice(0,1)[0].getPosition(),
          destination:markerList.slice(-1)[0].getPosition(),
          waypoints: markerList.slice(1,-1).map(marker=>({location:marker.getPosition(), stopover:true})),
          travelMode:google.maps.TravelMode.WALKING
      };

      directionsService.route(directionsRequest, function(result,status){
          if (status == google.maps.DirectionsStatus.OK){
              directionsDisplay.setMap(map);
              directionsDisplay.setDirections(result);
              console.log(directionsDisplay);
          }
      })
  })
    
  $('#marker-list').on('click', '.delete', function(e){
      e.preventDefault();
      var markerNode = $(this).closest('li'),
          marker = markerNode.data('marker'),
          markerIndex = markerNode.index();
      
      markerList.splice(markerIndex,1);
      marker.setMap(null);
      markerNode.remove();
      updateMarkers(true);
      removeDirections();
  })

    
    
    
    // initialise sortable markers
    const sortable = new Sortable.default(document.querySelectorAll('#marker-list'), {
        draggable: 'li',
        appendTo: '#marker-list',
        classes:{
            'source:dragging':'list-group-item-info'
        }
    });
    
    sortable.on('sortable:sorted', (event)=>{
        
        const removed = markerList.splice(event.oldIndex,1)[0];              
        markerList.splice(event.newIndex,0, removed)
    })
    sortable.on('sortable:stop', (event)=>{
        markerList.forEach(function(marker, index){
            marker.setLabel(index.toString());
        })
        setTimeout(function(){
            updateMarkers();
            removeDirections();
        },1)
    })

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      const currentTab = $(e.target) // newly activated tab
      drawStyle = drawingStyles[ currentTab.data('draw-style') ];
      stopDrawing();
    });
    updateMarkers();
}
let drawing;

function stopDrawing(event) {
  google.maps.event.removeListener(drawing);
  drawing = null;
  let path = poly.getPath();
  if (event) {
    path.push(event.latLng);
    updateLastPath(event);
  }
  mapStatus.disabled = true;
  calculateDistance(path);
}
function removeDirections(){
    directionsDisplay.setMap(null);
}
function startDrawing(event) {
  fidelityValue = +fidelity.value;
  drawing = map.addListener('mousemove', mouseDraw);
  mapStatus.disabled = false;
}

function toggleDrawing(event) {
  if (drawing) {
    stopDrawing(event);
  } else {
    startDrawing();
  }
}

function createMarker(event){
    const marker = new google.maps.Marker({
        position: event.latLng,
        map:map,
        draggable:true,
        label: markerList.length.toString()
    })
    marker.addListener('drag', function(event){
        updateMarkers();
        removeDirections()
    });
    markerList.push(marker);
    updateMarkers();
}
function updateMarkers(forceRename){
    let uiList = $('#marker-list');
    uiList.empty();
    
    markerList.forEach(function(marker, index){
        const position = marker.getPosition();
        if (forceRename){
            marker.setLabel(index.toString());
        }
        $('<li>',{
            class:'list-group-item',
            html: `Marker #${marker.getLabel()} 
                    <strong>@</strong><span class="text-muted font-italic">${position.lat().toFixed(4)}</span>,<span class="text-muted font-italic">${position.lng().toFixed(4)}</span>
                    <a href="#" class="btn btn-outline-danger btn-sm float-right delete">&times;</a>
                  `,
            data:{
                marker:marker
            }
        }).appendTo(uiList);
    })
}
function handleMapClick(event){
    switch (drawStyle){
        case drawingStyles.freehand:
            toggleDrawing(event)
            break;
        case drawingStyles.marker:
            createMarker(event);
            break;
        default:
            break;
    }
}

function mouseDraw(event) {
  let path = poly.getPath();
  let last = path.getArray().slice(-1)[0];

  if (!last || (last && google.maps.geometry.spherical.computeDistanceBetween(last, event.latLng) > +fidelityValue)) {
    path.push(event.latLng);
    updateLastPath(event);
    calculateDistance(path);
  }
}

function calculateDistance(path) {
  let points = path.getArray(),
    distance = google.maps.geometry.spherical.computeLength(points);

  pathLength.value = numberWithCommas(distance.toFixed(0));
}

function updateLastPath(event) {
  let lastpath = lastpointpoly.getPath();
  lastpath.pop();
  lastpath.pop();
  lastpath.push(event.latLng);
  lastpath.push(event.latLng);
}

const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

google.maps.event.addDomListener(window, 'load', initMap);
