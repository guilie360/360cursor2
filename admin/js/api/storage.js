/* Admin API — Supabase Storage (shared by media modules) */
var StorageApi = (function () {
  var BUCKET = 'proyectos-media';
  var PUBLIC_MARKER = '/storage/v1/object/public/' + BUCKET + '/';

  function getClient() {
    return AdminApi.getClient().storage.from(BUCKET);
  }

  function getPublicUrl(path) {
    return AdminApi.getClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function extractPath(publicUrl) {
    if (!publicUrl) return null;
    var idx = String(publicUrl).indexOf(PUBLIC_MARKER);
    if (idx === -1) return null;
    return decodeURIComponent(String(publicUrl).substring(idx + PUBLIC_MARKER.length).split('?')[0]);
  }

  function buildPath(constructoraId, proyectoId, folder, fileName) {
    return constructoraId + '/' + proyectoId + '/' + folder + '/' + fileName;
  }

  function extensionFromFile(file) {
    var parts = String(file.name || '').split('.');
    if (parts.length < 2) return 'bin';
    return parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  }

  async function upload(constructoraId, proyectoId, folder, file) {
    var ext = extensionFromFile(file);
    var fileName = folder + '-' + Date.now() + '.' + ext;
    var path = buildPath(constructoraId, proyectoId, folder, fileName);

    var result = await getClient().upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type
    });

    if (result.error) {
      throw new Error(result.error.message || 'Error subiendo archivo');
    }

    return {
      path: path,
      publicUrl: getPublicUrl(path)
    };
  }

  async function removeByUrl(publicUrl) {
    var path = extractPath(publicUrl);
    if (!path) return false;

    var result = await getClient().remove([path]);
    if (result.error) {
      throw new Error(result.error.message || 'Error eliminando archivo');
    }
    return true;
  }

  return {
    BUCKET: BUCKET,
    getPublicUrl: getPublicUrl,
    extractPath: extractPath,
    buildPath: buildPath,
    upload: upload,
    removeByUrl: removeByUrl
  };
})();
