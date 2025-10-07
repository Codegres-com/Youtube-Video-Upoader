import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

function App() {
  const [videoSrc, setVideoSrc] = useState('');
  const [thumbnailSrc, setThumbnailSrc] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        crossOrigin: 'anonymous'
      });
    };
    loadFFmpeg();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setThumbnailSrc('');
    }
  };

  const generateThumbnail = async () => {
    if (!videoFile) return;
    setIsLoading(true);
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    // Get video duration
    let duration = 0;
    ffmpeg.setLogger(({ message }) => {
      const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d{2}/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseInt(durationMatch[3], 10);
        duration = hours * 3600 + minutes * 60 + seconds;
      }
    });

    // We need to run a command to trigger the logger with duration info.
    // -f null - tells ffmpeg to not produce an output file.
    await ffmpeg.exec(['-i', 'input.mp4', '-f', 'null', '-']);

    const middleTime = duration / 2;

    await ffmpeg.exec(['-i', 'input.mp4', '-ss', middleTime.toString(), '-vframes', '1', 'output.jpg']);
    const data = await ffmpeg.readFile('output.jpg');
    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'image/jpeg' }));
    setThumbnailSrc(url);
    setIsLoading(false);
  };

  return (
    <div>
      <div>
        <h1>YouTube Thumbnail Generator</h1>
        <div>
          <label htmlFor="video-upload">
            Upload a video to generate a thumbnail
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
          />
        </div>
        {videoSrc && (
          <div>
            <h2>Your Video</h2>
            <video src={videoSrc} controls width="100%" />
            <button
              onClick={generateThumbnail}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Thumbnail'}
            </button>
          </div>
        )}
        {thumbnailSrc && (
          <div>
            <h2>Generated Thumbnail</h2>
            <img src={thumbnailSrc} alt="Generated Thumbnail" width="100%" />
            <a
              href={thumbnailSrc}
              download="thumbnail.jpg"
            >
              Download Thumbnail
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;