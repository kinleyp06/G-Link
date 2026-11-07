// Shows a picture from client/public/images. If the file is not there, it tries photo.fallback,
// then shows a dashed placeholder saying which photo is needed and the file name to save it as.
import { useState } from 'react';
import { photoUrl } from '../photos.js';

export function Photo({ photo, map = false, caption = false }) {
  const [stage, setStage] = useState(0); // 0 = the photo, 1 = its fallback, 2 = missing
  const file = stage === 0 ? photo.file : photo.fallback;
  if (stage === 2 || !file) {
    return (
      <figure className={`photo placeholder ${map ? 'map' : ''}`}>
        <span className="ph-tag">{map ? 'Map needed' : 'Photo needed'}</span>
        <strong>{photo.label}</strong>
        <span>{photo.hint}</span>
        <code>client/public/images/{photo.file}</code>
      </figure>
    );
  }
  const usingFallback = stage === 1;
  return (
    <figure className={`photo ${map && !usingFallback ? 'map' : ''} ${caption ? 'with-caption' : ''}`}>
      <img
        src={photoUrl(file)}
        alt={photo.label}
        loading="lazy"
        onError={() => setStage(stage === 0 && photo.fallback ? 1 : 2)}
      />
      {caption && <figcaption>{photo.label}</figcaption>}
    </figure>
  );
}

export function Gallery({ photos, caption = true }) {
  return (
    <div className="gallery">
      {photos.map((p) => <Photo key={p.file} photo={p} caption={caption} />)}
    </div>
  );
}

// One photo at a time with small numbered buttons: fits narrow cards (used for each room).
export function PhotoSwitcher({ photos }) {
  const [i, setI] = useState(0);
  return (
    <div className="switcher">
      <Photo key={photos[i].file} photo={photos[i]} caption />
      {photos.length > 1 && (
        <div className="switcher-dots" role="group" aria-label="Choose photo">
          {photos.map((p, j) => (
            <button key={p.file} type="button" className={j === i ? 'active' : ''} aria-pressed={j === i} aria-label={p.label} onClick={() => setI(j)}>
              {j + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
