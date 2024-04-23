window.onload = async () => {
    const elVideo = document.getElementById('video');
    const startButton = document.getElementById('startButton');

    navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);

    let rostrosConocidos;
    let nombresImagenes = [];
    let intervalId;
    let canvasCount = 0;

    const cargarCamera = async () => {
        navigator.getMedia(
            { video: true, audio: false },
            stream => elVideo.srcObject = stream,
            console.error
        );

        const respuesta = await fetch('http://127.0.0.1:3000/api/imagenes');
        nombresImagenes = await respuesta.json();

        const descriptoresRostro = [];

        for (let i = 0; i < nombresImagenes.length; i++) {
            const imagenReferencia = await faceapi.fetchImage(`Yo/${nombresImagenes[i]}`);
            const deteccionReferencia = await faceapi
                .detectSingleFace(imagenReferencia)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!deteccionReferencia) {
                console.error(`No se pudo detectar el rostro en la imagen de referencia Yo/${nombresImagenes[i]}`);
                continue;
            }

            descriptoresRostro.push(new faceapi.LabeledFaceDescriptors("Leonardo Cancino", [deteccionReferencia.descriptor]));
        }

        rostrosConocidos = new faceapi.FaceMatcher(descriptoresRostro, 0.9);
    };

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.ageGenderNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    ]);

    startButton.addEventListener('click', () => {
        if (startButton.textContent === 'Iniciar Reconocimiento Facial') {
            startButton.textContent = 'Detener Detección';
            const canvasElements = document.querySelectorAll('canvas');
            canvasElements.forEach((canvas, index) => {
                let canva = canvas.id
                canva.display = 'none'
            });
            cargarCamera();
        } else {
            const canvasElements = document.querySelectorAll('canvas');
            canvasElements.forEach((canvas, index) => {
                let canva = document.getElementById(canvas.id);
                canva.style.display = 'none'
            });

            // Detener la detección
            const stream = elVideo.srcObject;
            const tracks = stream.getTracks();

            tracks.forEach(function(track) {
                track.stop();
            });

            elVideo.srcObject = null;

            // Limpiar el intervalo
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }

            startButton.textContent = 'Iniciar Reconocimiento Facial';
        }
    });

    elVideo.addEventListener('play', async () => {
        const canvas = faceapi.createCanvasFromMedia(elVideo);
        canvas.id = 'canvas' + canvasCount++; // Asigna la clase al canvas
        document.body.append(canvas);

        const displaySize = { width: elVideo.width, height: elVideo.height };
        faceapi.matchDimensions(canvas, displaySize);

        if (intervalId) {
            clearInterval(intervalId);
        }

        intervalId = setInterval(async () => {
            const detections = await faceapi.detectAllFaces(elVideo)
                .withFaceLandmarks()
                .withFaceExpressions()
                .withAgeAndGender()
                .withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            if (elVideo.paused || elVideo.ended) {
                // Si el video está pausado o ha terminado, detén la detección
                return;
            }

            resizedDetections.forEach(detection => {
                const mejorCoincidencia = rostrosConocidos.findBestMatch(detection.descriptor);
                if (mejorCoincidencia.distance <= 0.45) {
                    const label = mejorCoincidencia.label;
                    const box = detection.detection.box;
                    const drawBox = new faceapi.draw.DrawBox(box, { label });
                    drawBox.draw(canvas);
                }
            });
        }, 1000);
    });

};
