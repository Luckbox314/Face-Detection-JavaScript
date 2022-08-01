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
    ctx.arc((rightEye[0]._x + rightEye[3]._x)/2 , (rightEye[0]._y + rightEye[3]._y)/2, 5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'red';
    ctx.stroke();

  
    

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
