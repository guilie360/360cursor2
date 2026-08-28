/* Media Engine — hero video & image processing */
var MediaEngine = (function () {
  var ACCEPT = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
  var IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';
  var MAX_BYTES = 200 * 1024 * 1024;
  var IMAGE_MAX_BYTES = 50 * 1024 * 1024;

  function validateVideo(file) {
    if (!file) return 'Selecciona un video.';
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    var ok = type.indexOf('video/') === 0 ||
      name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm');
    if (!ok) return 'Formato no soportado. Usa MP4, MOV o WebM.';
    if (file.size > MAX_BYTES) return 'El video supera el límite de 200 MB.';
    return '';
  }

  function loadVideoMeta(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = function () {
        resolve({ url: url, video: video, duration: video.duration || 0, width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer el video.'));
      };
      video.src = url;
    });
  }

  function captureThumbnail(video, duration) {
    return new Promise(function (resolve) {
      var canvas = document.createElement('canvas');
      var seekTime = Math.min(1.5, Math.max(0.5, (duration || 2) * 0.1));
      video.currentTime = seekTime;
      video.onseeked = function () {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          resolve(blob ? { blob: blob, url: URL.createObjectURL(blob) } : null);
        }, 'image/jpeg', 0.85);
      };
      video.onerror = function () { resolve(null); };
    });
  }

  function validateImage(file) {
    if (!file) return 'Selecciona una imagen.';
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    var ok = type.indexOf('image/') === 0 ||
      name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') ||
      name.endsWith('.webp') || name.endsWith('.gif');
    if (!ok) return 'Formato no soportado. Usa JPG, PNG, WebP o GIF.';
    if (file.size > IMAGE_MAX_BYTES) return 'La imagen supera el límite de 50 MB.';
    return '';
  }

  function loadImageMeta(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        resolve({ url: url, width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen.'));
      };
      image.src = url;
    });
  }

  async function processImage(file) {
    var error = validateImage(file);
    if (error) throw new Error(error);

    var meta = await loadImageMeta(file);
    return {
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      width: meta.width,
      height: meta.height,
      previewUrl: meta.url,
      status: 'ready'
    };
  }

  function hasHeroMedia(state) {
    return !!((state.heroVideo && state.heroVideo.file) || (state.heroImage && state.heroImage.file));
  }

  function heroMediaLabel(state) {
    if (state.heroVideo && state.heroVideo.file) {
      return state.heroVideo.durationLabel || 'Video';
    }
    if (state.heroImage && state.heroImage.file) {
      return state.heroImage.name || 'Imagen';
    }
    return null;
  }

  async function processVideo(file) {
    var error = validateVideo(file);
    if (error) throw new Error(error);

    var meta = await loadVideoMeta(file);
    var thumbnail = await captureThumbnail(meta.video, meta.duration);

    return {
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      duration: Math.round(meta.duration),
      durationLabel: formatDuration(meta.duration),
      width: meta.width,
      height: meta.height,
      previewUrl: meta.url,
      thumbnailBlob: thumbnail ? thumbnail.blob : null,
      thumbnailUrl: thumbnail ? thumbnail.url : null,
      optimized: true,
      status: 'ready'
    };
  }

  function formatDuration(seconds) {
    if (!seconds || !isFinite(seconds)) return '—';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  return {
    ACCEPT: ACCEPT,
    IMAGE_ACCEPT: IMAGE_ACCEPT,
    MAX_BYTES: MAX_BYTES,
    IMAGE_MAX_BYTES: IMAGE_MAX_BYTES,
    validateVideo: validateVideo,
    validateImage: validateImage,
    processVideo: processVideo,
    processImage: processImage,
    hasHeroMedia: hasHeroMedia,
    heroMediaLabel: heroMediaLabel,
    formatDuration: formatDuration
  };
})();
