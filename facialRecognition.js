const video = document.getElementById('video')

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

let labeledDescriptors = null;

async function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    async stream => {
      video.srcObject = stream;
      // Load labeled descriptors for face recognition
      labeledDescriptors = await loadLabeledImages();
      // Train face recognition model
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      // Start detecting faces
      detectFaces(faceMatcher);
    },
    err => console.error(err)
  )
}

async function loadLabeledImages() {
  const labels = ['Farid', 'Ronaldo']; // Names of subfolders inside "images" folder
  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let i = 1; i <= 3; i++) { // Use 3 images per person for training
        const img = await faceapi.fetchImage(`/images/${label}/${label}_${i}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

function detectFaces(faceMatcher) {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box
      const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
      drawBox.draw(canvas)
    })
  }, 100)
}
