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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6">YouTube Thumbnail Generator</h1>
        <div className="mb-6">
          <label htmlFor="video-upload" className="block text-lg font-medium text-gray-700 mb-2">
            Upload a video to generate a thumbnail
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
        </div>
        {videoSrc && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-4">Your Video</h2>
            <video src={videoSrc} controls className="w-full rounded-lg" />
            <button
              onClick={generateThumbnail}
              disabled={isLoading}
              className="mt-4 w-full bg-violet-600 text-white py-2 px-4 rounded-lg hover:bg-violet-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Generating...' : 'Generate Thumbnail'}
            </button>
          </div>
        )}
        {thumbnailSrc && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-4">Generated Thumbnail</h2>
            <img src={thumbnailSrc} alt="Generated Thumbnail" className="w-full rounded-lg" />
            <a
              href={thumbnailSrc}
              download="thumbnail.jpg"
              className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-center block"
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