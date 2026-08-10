import {randomShortUUID, buildAudioUrlWithTracking, removeHostFromUrl, extractHtmlBodyFragment} from "./StringUtils";

test('randomShortUUID', () => {
  expect(randomShortUUID().length).toBe(11);
  expect(randomShortUUID(20).length).toBe(20);
});

test('buildAudioUrlWithTracking', () => {
  const audioUrl = 'https://www.audio.com/audio.mp3'
  let trackingUrls = [
    'http://firsturl.com/123',
    'https://secondurl.com/abc/',
    'https://thridurl.com/aaa/bbb',
    'www.noprotocal.com/asdfsad',
  ];
  const finalUrl = 'https://firsturl.com/123/secondurl.com/abc/thridurl.com/aaa/bbb/www.noprotocal.com/asdfsad/www.audio.com/audio.mp3';
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe(finalUrl);

  trackingUrls = [];
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe(audioUrl);

  trackingUrls = ['http://firsturl.com/123/'];
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe("https://firsturl.com/123/www.audio.com/audio.mp3");

  trackingUrls = [''];
  expect(buildAudioUrlWithTracking(audioUrl, trackingUrls)).toBe(audioUrl);
});

test('removeHostFromUrl', () => {
  const url = 'https://www.audio.com/project/hello/audio.mp3';
  expect(removeHostFromUrl(url)).toBe('project/hello/audio.mp3');
  const badUrl = 'asfafffaf'
  expect(removeHostFromUrl(badUrl)).toBe(badUrl);
});

test('extractHtmlBodyFragment leaves ordinary fragments untouched', () => {
  const fragment = '<p>Hello <b>world</b></p>';
  expect(extractHtmlBodyFragment(fragment)).toBe(fragment);
  expect(extractHtmlBodyFragment('')).toBe('');
  expect(extractHtmlBodyFragment(null)).toBe(null);
});

test('extractHtmlBodyFragment unwraps a full document to a fragment', () => {
  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>My Page</title>
<link rel="stylesheet" href="https://fonts.example.com/font.css">
<style>.hi { color: red; }</style>
</head>
<body>
<nav class="site-nav">custom nav</nav>
<p>content</p>
</body>
</html>`;
  const result = extractHtmlBodyFragment(doc);
  expect(result).toContain('<link rel="stylesheet" href="https://fonts.example.com/font.css">');
  expect(result).toContain('<style>.hi { color: red; }</style>');
  expect(result).toContain('<nav class="site-nav">custom nav</nav>');
  expect(result).toContain('<p>content</p>');
  expect(result).not.toContain('<!DOCTYPE');
  expect(result).not.toContain('<html');
  expect(result).not.toContain('<head>');
  expect(result).not.toContain('<body');
  expect(result).not.toContain('<title>');
  expect(result).not.toContain('<meta');
});

test('extractHtmlBodyFragment falls back to the original when there is no body tag', () => {
  const malformed = '<html><head><title>oops</title></head>no body tag here';
  expect(extractHtmlBodyFragment(malformed)).toBe(malformed);
});
