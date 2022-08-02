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
        height: { ideal: 480 },
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
let fov = 133.01;
let dpi = 91;
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
scaleCube(cube, 15 )
moveCube(cube, 0, 135, 150)


let leftBuff
let rightBuff

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
    try{
      leftEye = resizedDetections[0].landmarks.getLeftEye()
      rightEye = resizedDetections[0].landmarks.getRightEye()
      leftBuff = leftEye
      rightBuff = rightEye
    } catch(e) {
      if (e instanceof TypeError) {
        console.log("No face detected")
        leftEye = leftBuff
        rightEye = rightBuff
      }
    }
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

function dotProduct3D(vector1, vector2) {
  return vector1[0] * vector2[0] + vector1[1] * vector2[1] + vector1[2] * vector2[2]
}

function crossProduct3D(vector1, vector2) {
  return [
    vector1[1] * vector2[2] - vector1[2] * vector2[1],
    vector1[2] * vector2[0] - vector1[0] * vector2[2],
    vector1[0] * vector2[1] - vector1[1] * vector2[0]
  ]
}

function getUnitVector(vector) {
  let magnitude = Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2) + Math.pow(vector[2], 2))
  return [vector[0] / magnitude, vector[1] / magnitude, vector[2] / magnitude]
}

function getFaceNormal(face) {
  let U = [face[3].x - face[1].x, face[3].y - face[1].y, face[3].z - face[1].z]
  let W = [face[3].x - face[2].x, face[3].y - face[2].y, face[3].z - face[2].z]
  let V = crossProduct3D(U, W)
  return getUnitVector(V)
}

function getCentroid(cube){
  let x = 0
  let y = 0
  let z = 0
  for (let i = 0; i < cube.vertex.length; i++) {
    x += cube.vertex[i].x
    y += cube.vertex[i].y
    z += cube.vertex[i].z
  }
  return {
    x: x / cube.vertex.length,
    y: y / cube.vertex.length,
    z: z / cube.vertex.length
  }
}


function drawCube(cube, canvas, cameraPos, windowPlane) {
  // obs: respetar la regla de la mano derecha al definir las caras
  face1 = [cube.vertex[0], cube.vertex[2], cube.vertex[3], cube.vertex[1]]
  face2 = [cube.vertex[4], cube.vertex[5], cube.vertex[7], cube.vertex[6]]
  face3 = [cube.vertex[0], cube.vertex[1], cube.vertex[5], cube.vertex[4]]
  face4 = [cube.vertex[2], cube.vertex[6], cube.vertex[7], cube.vertex[3]]
  face5 = [cube.vertex[1], cube.vertex[3], cube.vertex[7], cube.vertex[5]]
  face6 = [cube.vertex[0], cube.vertex[4], cube.vertex[6], cube.vertex[2]]  
  faces = [face1, face2, face3, face4, face5, face6]

  let centroid = getCentroid(cube)

  console.log(centroid)

  let viewVector = [centroid.x - cameraPos.x, centroid.y - cameraPos.y, centroid.z - cameraPos.z]
  let faceNormals = []
  for (let i = 0; i < faces.length; i++) {
    let normal = getFaceNormal(faces[i])
    faceNormals.push(normal)
  }
  let faceDots = []
  for (let i = 0; i < faces.length; i++) {
    let dot = dotProduct3D(faceNormals[i], viewVector)
    faceDots.push(dot)
  }
  console.log(faceDots)
  
  colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple']
  for (let i = 0; i < faces.length; i++) {
    if (faceDots[i] > 0) {
      drawFace(faces[i], canvas, windowPlane, cameraPos, colors[i])
    }
  }
}

yOffset = -135

function drawFace(face, canvas, windowPlane, cameraPos, color) {
  let ctx = canvas.getContext("2d");
  let faceVertices = face.map((vertex) => pointProjection(vertex, windowPlane, cameraPos));
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(faceVertices[0].x * dpi * 0.03937 + cameraWidth/2, (faceVertices[0].y + yOffset)  * dpi * 0.03937 + cameraHeight/2);
  for (let i = 1; i < faceVertices.length; i++) {
    ctx.lineTo(faceVertices[i].x * dpi * 0.03937 + cameraWidth/2, (faceVertices[i].y + yOffset) * dpi * 0.03937 + cameraHeight/2);
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
  lambda = -point.z / (point.z - cameraPos.z)
  x = -(((point.x - cameraPos.x) * lambda) + point.x)
  y = (((point.y - cameraPos.y) * lambda) + point.y)
  return {x: x, y: y}
}

function distanceToFace(face, cameraPos) {
  let distance = 0
  for (let i = 0; i < face.length; i++) {
    distance = Math.max(distance, distance3D(face[i], cameraPos));
  }
  return distance
}
