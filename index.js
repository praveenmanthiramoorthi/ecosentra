require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db } = require('./firebase.js');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

const app = express();
const port = 3000;

// Configure Cloudinary using credentials from .env file
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Configure Multer for in-memory storage to handle the file temporarily
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use('/img', express.static(__dirname + '/img'));
app.use(bodyParser.json());
app.use(cors());

// --- New API endpoint for handling image uploads to Cloudinary ---
app.post('/upload-image', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Function to upload the file stream to Cloudinary
    let streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
              (error, result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(error);
                }
              }
            );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
    };

    // Async function to process the upload and send the response
    async function processUpload(buffer) {
        try {
            let result = await streamUpload(buffer);
            // Send back the secure URL of the uploaded image
            res.json({ secure_url: result.secure_url });
        } catch (error) {
            console.error('Cloudinary Upload Error:', error);
            res.status(500).send('Error uploading to Cloudinary.');
        }
    }

    processUpload(req.file.buffer);
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/landing.html');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

