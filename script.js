const video = document.getElementById('video')

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

let cameraHeight = 480;
let cameraWidth = 640;

async function startVideo()  {
  display = await navigator.getUserMedia(
    { video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
  let settings = display.getVideoTracks()[0].getSettings();
  cameraWidth = settings.width;
  cameraHeight = settings.height;
}

let interPupilDistance = 61; // mm
let fov = 60;
let dpi = 96;
let cube = {
  vertex : [
    {x: -1, y: -1, z: -1},
    {x: -1, y: -1, z: 1},
    {x: -1, y: 1, z: -1},
    {x: -1, y: 1, z: 1},
    {x: 1, y: -1, z: -1},
    {x: 1, y: -1, z: 1},
    {x: 1, y: 1, z: -1},
    {x: 1, y: 1, z: 1}
  ]
}
scaleCube(cube, 10)
moveCube(cube, 40, 20, -20)



video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  var ctx = canvas.getContext("2d");
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    
    leftEye = resizedDetections[0].landmarks.getLeftEye()
    rightEye = resizedDetections[0].landmarks.getRightEye()
    leftPupil = getPupilPixelPosition(leftEye)
    rightPupil = getPupilPixelPosition(rightEye)
    // console.log(`Posición de pupila derecha: ${rightPupil.x}, ${rightPupil.y}`)
    leftAngle = pixelPositionToAnglePosition(leftPupil)
    rightAngle = pixelPositionToAnglePosition(rightPupil)
    console.log(`Posición en angulos de pupila derecha: ${rightAngle.x}, ${rightAngle.y}`)
    angleDistance = distance(leftAngle, rightAngle)
    // console.log(angleDistance)
    // console.log(`Angulo entre ojos: ${angleDistance}`)
    eyeDistance = angleToDistance(angleDistance)
    // console.log(`Distancia al ojo: ${eyeDistance}`)
    ctx.beginPath();
    ctx.moveTo(cameraWidth/2, 0);
    ctx.lineTo(cameraWidth/2, cameraHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, cameraHeight/2);
    ctx.lineTo(cameraWidth, cameraHeight/2);
    ctx.stroke();
    posRightEye = getEyePupilPosition(eyeDistance, rightAngle.y, rightAngle.x)
    posLeftEye = getEyePupilPosition(eyeDistance, leftAngle.y, leftAngle.x)
    console.log(`Posición en espacio de pupila derecha: ${posRightEye.x}, ${posRightEye.y}, ${posRightEye.z}`)

    ctx.beginPath();
    ctx.arc((rightEye[0]._x + rightEye[3]._x)/2 , (rightEye[0]._y + rightEye[3]._y)/2, (Math.abs(rightEye[0]._x - rightEye[3]._x))/2, 0, 2 * Math.PI);
    ctx.lineWidth = (Math.abs(rightEye[0]._x - rightEye[3]._x))*0.1;
    ctx.strokeStyle = 'red';
    ctx.stroke();
    drawCube(cube, canvas, posRightEye, null)

  
    

  }, 50)
})

function getPupilPixelPosition(eye) {
  return {
    x: (eye[0]._x + eye[3]._x)/2,
    y: (eye[0]._y + eye[3]._y)/2
  }
}

function pixelPositionToAnglePosition(pixelPos) {
  let horizontalAngle = cameraWidth * fov / Math.sqrt(Math.pow(cameraWidth, 2) + Math.pow(cameraHeight, 2))
  let verticalAngle = cameraHeight * fov / Math.sqrt(Math.pow(cameraWidth, 2) + Math.pow(cameraHeight, 2))
  return {
    x: (pixelPos.x - cameraWidth/2) * horizontalAngle / cameraWidth,
    y: (pixelPos.y - cameraHeight/2) * verticalAngle /cameraHeight
  }
}

function distance(pos1, pos2){
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
}
function distance3D(pos1, pos2){
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2))
}

function angleToDistance(angle){
  return getTanFromDegrees((180 - angle)/2) * (interPupilDistance / 2)
}

function getTanFromDegrees(degrees) {
  return Math.tan(degrees * Math.PI / 180);
}

function getEyePupilPosition(distance, altitude, azimuth) {
  let radAltitude = altitude * Math.PI / 180
  let radAzimuth = azimuth * Math.PI / 180
  let z = distance * Math.cos(radAltitude) * Math.cos(radAzimuth)
  let x = distance * Math.cos(radAltitude) * Math.sin(radAzimuth)
  let y = distance * Math.sin(radAltitude)
  return {
    x: x,
    y: y,
    z: z
  }
}

function drawCube(cube, canvas, cameraPos, windowPlane) {
  face1 = [cube.vertex[0], cube.vertex[1], cube.vertex[3], cube.vertex[2]]
  face2 = [cube.vertex[4], cube.vertex[5], cube.vertex[7], cube.vertex[6]]
  face3 = [cube.vertex[0], cube.vertex[1], cube.vertex[5], cube.vertex[4]]
  face4 = [cube.vertex[2], cube.vertex[3], cube.vertex[7], cube.vertex[6]]
  face5 = [cube.vertex[1], cube.vertex[5], cube.vertex[7], cube.vertex[3]]
  face6 = [cube.vertex[0], cube.vertex[4], cube.vertex[6], cube.vertex[2]]
  faces = [face1, face2, face3, face4, face5, face6]
  faces = faces.sort((a) =>  distanceToFace(a, cameraPos));
  colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple']
  for (let i = 0; i < faces.length; i++) {
    drawFace(faces[i], canvas, windowPlane, cameraPos, colors[i])
  }

  
}

function drawFace(face, canvas, windowPlane, cameraPos, color) {
  let ctx = canvas.getContext("2d");
  let faceVertices = face.map((vertex) => pointProjection(vertex, windowPlane, cameraPos));
  
  ctx.fillStyle = color;
  ctx.beginPath();
  console.log(faceVertices[0].x * dpi * 0.03937, faceVertices[0].y * dpi * 0.03937)
  ctx.moveTo(faceVertices[0].x * dpi * 0.03937, faceVertices[0].y * dpi * 0.03937);
  for (let i = 1; i < faceVertices.length; i++) {
    ctx.lineTo(faceVertices[i].x * dpi * 0.03937, faceVertices[i].y * dpi * 0.03937);
  }
  ctx.closePath();
  ctx.fill();
}

function moveCube(cube, x, y, z) {
  for (let i = 0; i < cube.vertex.length; i++) {
    cube.vertex[i].x += x;
    cube.vertex[i].y += y;
    cube.vertex[i].z += z;
  }
}

function scaleCube(cube, scale) {
  for (let i = 0; i < cube.vertex.length; i++) {
    cube.vertex[i].x *= scale;
    cube.vertex[i].y *= scale;
    cube.vertex[i].z *= scale;
  }
}

function pointProjection(point, plane, cameraPos) {
  lambda = point.z / (point.z - cameraPos.z)
  x = (point.x - cameraPos.x * lambda) + point.x
  y = (point.y - cameraPos.y * lambda) + point.y
  return {x: x, y: y}
}

function distanceToFace(face, cameraPos) {
  let distance = 0
  for (let i = 0; i < face.length; i++) {
    distance = Math.max(distance, distance3D(face[i], cameraPos));
  }
  return distance
}
