const video = document.getElementById('video')

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}

let interPupilDistance = 61; // mm


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
    console.log(`Posición de pupila derecha: ${rightPupil.x}, ${rightPupil.y}`)
    leftAngle = pixelPositionToAnglePosition(leftPupil)
    rightAngle = pixelPositionToAnglePosition(rightPupil)
    console.log(`Posición en angulos de pupila derecha: ${rightAngle.x}, ${rightAngle.y}`)
    angleDistance = distance(leftAngle, rightAngle)
    console.log(angleDistance)
    console.log(`Angulo entre ojos: ${angleDistance}`)
    eyeDistance = angleToDistance(angleDistance)
    console.log(`Distancia al ojo: ${eyeDistance}`)
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(320, 480);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(640, 240);
    ctx.stroke();

    // ctx.beginPath();
    // ctx.arc((rightEye[0]._x + rightEye[3]._x)/2 , (rightEye[0]._y + rightEye[3]._y)/2, 5, 0, 2 * Math.PI);
    // ctx.arc((leftEye[0]._x + leftEye[3]._x)/2 , (leftEye[0]._y + leftEye[3]._y)/2, 5, 0, 2 * Math.PI);
    // ctx.strokeStyle = 'blue';
    // ctx.stroke();

  
    

  }, 50)
})

function getPupilPixelPosition(eye) {
  return {
    x: (eye[0]._x + eye[3]._x)/2,
    y: (eye[0]._y + eye[3]._y)/2
  }
}

function pixelPositionToAnglePosition(pixelPos) {
  return {
    x: (pixelPos.x - 320) * 0.05625,
    y: (pixelPos.y - 240) * 0.075 
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