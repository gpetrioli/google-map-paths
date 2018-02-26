# google-map-paths
Quickly hacked-together tool for creating routes/paths in google maps (either freehand or using the directions api between specific points)

Currently it supports 

- hand drawing mode: path drawing (_while moving mouse_) where you can control the fidelity of the path (_after how many meters it will create a new point_)
- marker mode: placing markers (_they are draggable to adjust their position and the list is sortable to allow a specific order for the directions api to follow _) and then calling the Google Maps Directions API to get an path.
- exporting the path: as a JSON list of lattitude/longitude objects

Limitations:
- The google maps directions API allows only 23 waypoints (_besides first/last nodes_)  
(_see https://developers.google.com/maps/documentation/javascript/directions#waypoint-limits_)

Uses:
 - Bootstrap 4 (_https://getbootstrap.com/docs/4.0/_)
 - Google Maps Javascript API (_https://developers.google.com/maps/documentation/javascript/_)
 - Google Maps API Directions Service (_https://developers.google.com/maps/documentation/javascript/directions_)
 - The Sortable module of the Draggable Library from Shopify (_https://github.com/Shopify/draggable/tree/master/src/Sortable_)
