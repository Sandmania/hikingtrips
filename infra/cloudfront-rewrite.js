// CloudFront Function (runtime: cloudfront-js-2.0), event: viewer-request.
//
// Purpose: host multiple static apps in subdirectories of one S3/CloudFront
// distribution (private bucket, OAC/REST origin) without breaking relative
// asset paths.
//
// For each subdirectory listed in SUBDIRS it does two things:
//   1. "/name"   -> 301 redirect to "/name/"   (so the browser's address bar
//      gets the trailing slash; relative "assets/..." then resolve against
//      "/name/" instead of the domain root).
//   2. "/name/"  -> internally rewrite to "/name/index.html" (CloudFront's
//      Default Root Object only covers "/", not subfolders, and the S3 REST
//      origin won't serve a folder index on its own).
//
// Everything else passes through untouched -- this is an exact-match allowlist,
// so it never affects other paths on the domain. Add a new app by adding one
// string below.
//
// Deploy:
//   1. CloudFront console -> Functions -> Create function
//        name: subdir-index-rewrite, runtime: cloudfront-js-2.0
//        paste this file, then Publish.
//   2. Distribution -> Behaviors -> default (*) -> Viewer request ->
//        CloudFront Functions -> select subdir-index-rewrite -> Save.
//   (Must be Published, not just created, before it can be associated.)

var SUBDIRS = ['vaellukset'];

function handler(event) {
  var req = event.request;
  var uri = req.uri;

  for (var i = 0; i < SUBDIRS.length; i++) {
    var base = '/' + SUBDIRS[i];

    if (uri === base) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: base + '/' } }
      };
    }

    if (uri === base + '/') {
      req.uri = base + '/index.html';
      return req;
    }
  }

  return req;
}
