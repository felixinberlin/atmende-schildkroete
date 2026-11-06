import { memo } from 'react';

/**
 * Static SVG of Tika's rig. Element ids must match RIG_PARTS in src/breathing/turtle/rig.ts.
 * Memoised with no props: React renders it once and the breathing session animates it directly.
 */
export const TurtleRigSvg = memo(function TurtleRigSvg() {
  return (
    <svg viewBox="100 80 600 440" width="100%" height="100%" className="turtle-svg-frame" role="img" aria-label="Tika die Schildkröte atmet">
      <defs>
        <linearGradient id="widget-grad-belly" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047"/>
          <stop offset="100%" stopColor="#eab308"/>
        </linearGradient>
        <radialGradient id="widget-grad-bubble" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9}/>
          <stop offset="40%" stopColor="#7dd3fc" stopOpacity={0.7}/>
          <stop offset="100%" stopColor="#0284c7" stopOpacity={0.3}/>
        </radialGradient>
        <g id="widget-bubble">
          <circle cx="0" cy="0" r="10" fill="url(#widget-grad-bubble)"/>
          <circle cx="-3" cy="-3" r="2.8" fill="#ffffff" opacity={0.85}/>
          <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="1.2" opacity={0.7}/>
        </g>
      </defs>
  
      {/* Guide Rings */}
      <g id="layer-guides">
        <circle cx="400" cy="300" r="210" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeDasharray="8 6" opacity={0.3}/>
        <circle cx="400" cy="300" r="225" fill="none" stroke="#5eead4" strokeWidth="1.2" strokeDasharray="3 7" opacity={0.2}/>
      </g>
  
      {/* Main Rigged Character */}
      <g id="layer-turtle-character">
        {/* Distant flippers */}
        <g id="rig-limbs-distant">
          <path id="rig-flipper-rear-lt" d="M 270 290 C 230 250 170 260 130 290 C 120 298 130 315 150 315 C 190 315 240 310 270 290 Z" fill="#047857"/>
          <path id="rig-flipper-front-lt" d="M 470 250 C 510 180 570 120 630 110 C 645 108 650 120 640 135 C 595 190 535 255 480 270 Z" fill="#047857"/>
        </g>
  
        {/* Tail */}
        <path id="rig-tail" d="M 230 320 C 190 325 150 338 135 348 C 150 355 190 350 235 338 Z" fill="#10b981"/>
  
        {/* Soft Belly (Plastron) */}
        <g id="rig-plastron">
          <path id="part-belly-base" d="M 250 320 C 270 380 360 415 450 395 C 480 388 495 365 500 330 C 460 345 360 355 250 320 Z" fill="url(#widget-grad-belly)"/>
          <path id="part-belly-shadow" d="M 280 350 C 340 395 420 405 460 385 C 440 375 360 365 300 340 Z" fill="#eab308"/>
          <path id="part-belly-groove-1" d="M 340 345 C 350 372 370 392 390 398" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path id="part-belly-groove-2" d="M 415 340 C 430 365 445 380 460 382" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </g>
  
        {/* Shell (Carapace) */}
        <g id="rig-carapace">
          <path id="part-shell-dome" d="M 215 320 C 210 200 320 145 440 160 C 510 170 545 225 530 320 C 475 345 275 345 215 320 Z" fill="#065f46"/>
          <path id="part-shell-rim" d="M 210 320 C 230 345 300 358 385 354 C 460 350 515 342 535 320 C 525 338 460 365 385 362 C 295 360 225 340 210 320 Z" fill="#f59e0b"/>
  
          {/* Scutes */}
          <path d="M 255 240 L 310 220 L 330 260 L 290 280 L 250 265 Z" fill="#10b981"/>
          <circle cx="288" cy="254" r="3.5" fill="#a7f3d0" opacity={0.8}/>
          <path d="M 320 215 L 390 195 L 430 220 L 400 260 L 340 255 Z" fill="#34d399"/>
          <circle cx="375" cy="230" r="4" fill="#ecfdf5" opacity={0.9}/>
          <path d="M 400 195 L 455 210 L 485 245 L 440 265 L 410 225 Z" fill="#10b981"/>
          <circle cx="445" cy="232" r="3.5" fill="#a7f3d0" opacity={0.8}/>
          <path d="M 345 265 L 405 268 L 435 310 L 375 315 L 330 295 Z" fill="#059669"/>
          <circle cx="380" cy="290" r="3.5" fill="#a7f3d0" opacity={0.8}/>
          <path d="M 445 270 L 485 250 L 515 285 L 495 320 L 440 315 Z" fill="#10b981"/>
          <circle cx="475" cy="290" r="3" fill="#a7f3d0" opacity={0.8}/>
          <path d="M 285 285 L 325 295 L 340 325 L 280 325 L 250 305 Z" fill="#047857"/>
          <circle cx="295" cy="308" r="3" fill="#a7f3d0" opacity={0.8}/>
          <path d="M 260 215 C 330 170 410 175 465 195" stroke="#a7f3d0" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity={0.7}/>
        </g>
  
        {/* Head & Neck */}
        <g id="rig-head-neck">
          <path id="part-neck-base" d="M 470 315 C 500 320 540 310 575 280 C 585 265 575 240 550 230 C 515 220 480 240 460 265 Z" fill="#10b981"/>
          <path id="part-throat-gular" d="M 535 290 C 555 304 575 298 590 282" stroke="#059669" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.7}/>
          <path id="part-head-profile" d="M 545 240 C 555 195 615 190 655 215 C 690 238 695 275 670 295 C 640 315 585 310 555 280 C 542 268 540 252 545 240 Z" fill="#10b981"/>
          <path id="part-chin-shadow" d="M 565 282 C 600 305 645 305 668 288 C 650 295 610 295 580 282 Z" fill="#059669"/>
          <circle id="part-nostril" cx="674" cy="250" r="2.5" fill="#064e3b"/>
          <path id="part-mouth" d="M 676 264 C 668 274 650 280 630 276" stroke="#064e3b" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <ellipse id="part-cheek" cx="628" cy="270" rx="9" ry="6" fill="#fb7185" opacity={0.6}/>
          <circle cx="585" cy="215" r="4" fill="#6ee7b7"/>
          <circle cx="605" cy="210" r="5" fill="#6ee7b7"/>
          <circle cx="625" cy="218" r="4.5" fill="#6ee7b7"/>
  
          {/* Eye with natural blink */}
          <g id="rig-eye">
            <ellipse cx="605" cy="235" rx="15" ry="17" fill="#ffffff" stroke="#065f46" strokeWidth="2"/>
            <ellipse cx="608" cy="235" rx="11" ry="13" fill="#1e293b"/>
            <circle cx="612" cy="230" r="4.5" fill="#ffffff"/>
            <circle cx="604" cy="242" r="2.2" fill="#ffffff"/>
            <circle cx="615" cy="239" r="1.3" fill="#ffffff"/>
          </g>
        </g>
  
        {/* Foreground flippers */}
        <g id="rig-flipper-front-rt">
          <path d="M 470 315 C 510 335 565 390 580 460 C 585 485 568 495 545 490 C 495 478 450 410 430 360 C 420 338 440 315 470 315 Z" fill="#10b981" stroke="#059669" strokeWidth="2"/>
          <circle cx="475" cy="355" r="5" fill="#6ee7b7"/>
          <circle cx="500" cy="395" r="5.5" fill="#6ee7b7"/>
          <circle cx="525" cy="440" r="4.5" fill="#6ee7b7"/>
        </g>
  
        <g id="rig-flipper-rear-rt">
          <path d="M 245 335 C 215 370 160 415 125 425 C 112 428 110 415 122 400 C 155 360 215 328 245 335 Z" fill="#10b981" stroke="#059669" strokeWidth="2"/>
          <circle cx="170" cy="385" r="4" fill="#6ee7b7"/>
        </g>
  
        {/* Bubbles (Only during Exhale) */}
        <g id="rig-breath-fx" style={{ opacity: 0 }}>
          <use href="#widget-bubble" transform="scale(1.1)"/>
        </g>
      </g>
    </svg>
  );
});
