# Pictures on the G-Link website

All photos are of the CST guest house, taken by the team, resized to at most 1080 px and compressed
(about 2 MB for all 22). Replace a picture by saving a new file **with the same name**: the site picks it up,
no code change. The list in code is `client/src/photos.js`. If a file is missing, the site shows a
dashed "Photo needed" box with the file name.

| File | Where it is shown |
|---|---|
| `guesthouse/evening.jpg` | Home page banner |
| `guesthouse/front.jpg`, `garden.jpg`, `back.jpg`, `entrance.jpg` | Home page, "The guest house" |
| `guesthouse/front-night.jpg` | Sign in page |
| `facilities/dining-room.jpg`, `canteen.jpg`, `outdoor-dining.jpg` | Home page, "Facilities" |
| `rooms/three-bed-1.jpg` ... `three-bed-3.jpg`, `three-bed-bath.jpg` | Rooms page, every 3-bed room |
| `rooms/suite-bedroom.jpg`, `suite-lounge.jpg`, `suite-kitchen.jpg`, `suite-bath.jpg`, `suite-entrance.jpg` | Rooms page, the suite (room type "Suite"); the lounge also on Home |
| `hall/hall-1.jpg`, `hall-3.jpg` | Meeting hall page (hall-1 also on Home, hall-3 on Floor map) |
| `floors/ground-corridor.jpg`, `first-corridor.jpg` | Floor map page |
| `floor-maps/floor-1.svg` | Floor map page: ground floor plan, drawn from the team's sketch (not to scale) |

## Still to add (optional)

| File | What it should show |
|---|---|
| `floor-maps/floor-2.svg` (or `.png` renamed in `photos.js`) | First floor plan. Until then the Floor map page shows the first floor corridor photo. |
| `floor-maps/campus-map.png` | Where the guest house is on the CST campus, with the main gate. Until then the front photo is shown. |

Room photos go by **room type**: rooms of type "Suite" show the suite photos, all others the 3-bed room photos.
