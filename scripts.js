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
    
    document.querySelector('#manual-marker').addEventListener('click', function(e){
        e.preventDefault();
        
        const lat = +document.querySelector('#manual-latitude').value,
              lng = +document.querySelector('#manual-longitude').value;
        
        if (lat && lng){
            const fakeEvent = {
                latLng: new google.maps.LatLng(lat, lng)
            }
            createMarker(fakeEvent);
        } else {
            alert('You must enter both latitude and longitude to add a marker.')
        }
        
    })
    
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
          }
      })
  })
    
  $('#marker-list').on('click', '.delete', function(e){
      e.preventDefault();
      const markerNode = $(this).closest('.list-group-item'),
          marker = markerNode.data('marker'),
          markerIndex = markerNode.index();
      
      marker.setMap(null);
      markerNode.remove();
      markerList.splice(markerIndex,1);
      updateMarkers(true);
      removeDirections();
  }).on('mouseenter', '.list-group-item', function(e){
      const marker = $(this).data('marker');
      if(marker){
        marker.setAnimation(google.maps.Animation.BOUNCE);
      }
  }).on('mouseleave', '.list-group-item', function(e){
      const marker = $(this).data('marker');
      if (marker){
        marker.setAnimation(null);
      }
  })

    
    
    // initialise sortable markers
    const sortable = new Sortable.default(document.querySelectorAll('#marker-list'), {
        draggable: '.list-group-item',
        appendTo: '#marker-list',
        handle: '.dragger',
        classes:{
            'source:dragging':'list-group-item-info'
        }
    });
    
    sortable.on('sortable:sorted', (event)=>{
        
        const removed = markerList.splice(event.oldIndex,1)[0];              
        markerList.splice(event.newIndex,0, removed)
    })
    
    sortable.on('sortable:start', (event)=>{
        const source = $(event.dragEvent.data.originalSource),
              marker = source.data('marker');
        console.log(source)
        setTimeout(function(){marker.setAnimation(google.maps.Animation.BOUNCE);},20);
    })
    sortable.on('sortable:stop', (event)=>{
        const source = $(event.dragEvent.data.originalSource),
              marker = source.data('marker');
        
        setTimeout(function(){marker.setAnimation(null);},20);
        
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
        optimized:false,
        label: markerList.length.toString(),
        icon: {
            url:'assets/marker-numbered.png',
            labelOrigin: new google.maps.Point(15,15)
        }
    });
    let markerTimer = null,
        markerInterval = null;
    
    marker.custom = {label: marker.getLabel()}
    
    marker.addListener('mouseover', function(event){
        $('#marker-list').children().filter(function(){
            return $(this).data('marker') === marker
        }).addClass('highlighted')
    })
    marker.addListener('mouseout', function(event){
        $('#marker-list').children().filter(function(){
            return $(this).data('marker') === marker
        }).removeClass('highlighted')
    })
    
    marker.addListener('drag', function(event){
        updateMarkers();
        removeDirections()
    });
    
    marker.addListener('animation_changed', function(event){
        const marker = this;

        clearTimeout(markerTimer);
        
        if(marker.getAnimation() === null){
            markerTimer = setTimeout(function(){
                clearInterval(markerInterval);
                markerInterval = null;
            },100)
        } else {
            if (markerInterval === null){
                markerInterval = setInterval(function(){
                    marker.setIcon({
                         url:'assets/marker-numbered.png',
                        labelOrigin: new google.maps.Point(15,15)
                    })
                },1000/60);
            }
        }
    })
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
        $('<div>',{
            class:'list-group-item list-group-item-action d-flex p-0',
            html: `<span class="float-left p-2 border-right dragger">⇅</span> 
                    <div class="float-left p-2 mr-auto">Marker #${marker.getLabel()} <strong>@</strong><span class="text-muted font-italic" title="${position.lat()}">${position.lat().toFixed(4)}</span>,<span class="text-muted font-italic" title="${position.lng()}">${position.lng().toFixed(4)}</span></div>
                    <a href="#" class="btn btn-outline-danger btn-sm delete align-self-start mt-1 mr-1">&times;</a>
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
