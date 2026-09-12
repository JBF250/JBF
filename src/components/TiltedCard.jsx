import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import './TiltedCard.css';

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

export default function TiltedCard({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = '300px',
  containerWidth = '100%',
  imageHeight = '300px',
  imageWidth = '300px',
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = true,
  showTooltip = false,
  overlayContent = null,
  displayOverlayContent = false
}) {
  const ref = useRef(null);

  const x = useMotionValue();
  const y = useMotionValue();
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1
  });

  const [lastY, setLastY] = useState(0);

  // 图片加载动画：骨架图 + 中央圆形进度环，加载完成后渐入图片
  const loadedRef = useRef(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadedRef.current = false;
    setImgLoaded(false);
    setProgress(0);

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      loadedRef.current = true;
      setProgress(100);
      setImgLoaded(true);
    };
    if (img.complete) {
      loadedRef.current = true;
      setProgress(100);
      setImgLoaded(true);
    }

    // 图片未就绪时，用缓动动画模拟 0→100 的进度
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const duration = 1400;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now) => {
      if (loadedRef.current) return;
      const t = Math.min((now - t0) / duration, 1);
      setProgress(Math.min(ease(t) * 100, 99));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [imageSrc]);

  const ringRadius = 21;
  const ringLength = 2 * Math.PI * ringRadius;

  function handleMouse(e) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  return (
    <figure
      ref={ref}
      className="tilted-card-figure"
      style={{
        height: containerHeight,
        width: containerWidth
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showMobileWarning && (
        <div className="tilted-card-mobile-alert">This effect is not optimized for mobile. Check on desktop.</div>
      )}

      <motion.div
        className="tilted-card-inner"
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale
        }}
      >
        <motion.img
          src={imageSrc}
          alt={altText}
          className="tilted-card-img"
          style={{
            width: imageWidth,
            height: imageHeight,
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.6s ease'
          }}
        />

        {!imgLoaded && (
          <div
            className="tilted-card-loading"
            style={{ width: imageWidth, height: imageHeight }}
          >
            <span className="skeleton-shimmer" />
            <svg
              className="tilted-loader-ring"
              viewBox="0 0 48 48"
              width="56"
              height="56"
            >
              <circle
                cx="24"
                cy="24"
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="4"
              />
              <circle
                cx="24"
                cy="24"
                r={ringRadius}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ringLength}
                strokeDashoffset={ringLength * (1 - progress / 100)}
                transform="rotate(-90 24 24)"
              />
            </svg>
            <span className="tilted-loader-text">{Math.round(progress)}%</span>
          </div>
        )}

        {displayOverlayContent && overlayContent && (
          <motion.div className="tilted-card-overlay">{overlayContent}</motion.div>
        )}
      </motion.div>

      {showTooltip && (
        <motion.figcaption
          className="tilted-card-caption"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}
