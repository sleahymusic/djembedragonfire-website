(() => {
  const section = document.getElementById('watch-live');
  const video = document.getElementById('vrcdnLiveVideo');
  const startButton = document.getElementById('liveVideoStart');
  const status = document.getElementById('liveVideoStatus');
  const idlePanel = document.getElementById('liveVideoIdle');

  if (!section || !video || !startButton || !status) return;

  const streamUrl = section.dataset.streamUrl || '';
  const fallbackUrl = section.dataset.fallbackUrl || '';
  let player = null;
  let isStarting = false;

  function setStatus(message, state = '') {
    status.textContent = message;
    status.classList.remove('is-live', 'is-error');
    if (state) status.classList.add(state);
  }

  function setButton(label, disabled = false) {
    startButton.textContent = label;
    startButton.disabled = disabled;
  }

  function showIdlePanel(show) {
    if (idlePanel) idlePanel.classList.toggle('is-hidden', !show);
  }

  function destroyPlayer() {
    if (player) {
      try {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      } catch (error) {
        // Ignore cleanup errors from a stream that has already disconnected.
      }
      player = null;
    }

    video.removeAttribute('src');
    video.load();
    isStarting = false;
  }

  async function startNativeFallback() {
    if (!fallbackUrl) throw new Error('No fallback video URL is configured.');

    video.src = fallbackUrl;
    video.load();
    await video.play();
  }

  async function startLiveVideo() {
    if (isStarting) return;

    if (!video.paused && !video.ended) {
      video.pause();
      setButton('▶ Resume Live Video');
      setStatus('Live video paused. Press Resume Live Video to continue.');
      return;
    }

    if (player && video.paused) {
      try {
        await video.play();
        setButton('Pause Live Video');
        setStatus('Live video connected.', 'is-live');
      } catch (error) {
        setStatus('Press the player controls to resume the live video.', 'is-error');
      }
      return;
    }

    isStarting = true;
    setButton('Connecting…', true);
    setStatus('Connecting to the VRCDN live video stream…');

    try {
      const canUseMpegTs = window.mpegts
        && typeof window.mpegts.getFeatureList === 'function'
        && window.mpegts.getFeatureList().mseLivePlayback;

      if (canUseMpegTs && streamUrl) {
        player = window.mpegts.createPlayer({
          type: 'mpegts',
          isLive: true,
          url: streamUrl
        }, {
          enableStashBuffer: false,
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 30,
          autoCleanupMinBackwardDuration: 10
        });

        player.attachMediaElement(video);

        if (window.mpegts.Events && window.mpegts.Events.ERROR) {
          player.on(window.mpegts.Events.ERROR, () => {
            setStatus('The live video is offline or temporarily unavailable. Start the broadcast in OBS, then press Retry.', 'is-error');
            setButton('↻ Retry Live Video');
            isStarting = false;
          });
        }

        player.load();
        await player.play();
      } else {
        await startNativeFallback();
      }

      showIdlePanel(false);
      setButton('Pause Live Video');
      setStatus('Live video connected.', 'is-live');
    } catch (error) {
      destroyPlayer();
      showIdlePanel(true);
      setButton('↻ Retry Live Video');
      setStatus('The live video is offline or could not be opened. Start the VRCDN broadcast, then press Retry.', 'is-error');
    } finally {
      isStarting = false;
      startButton.disabled = false;
    }
  }

  startButton.addEventListener('click', startLiveVideo);

  video.addEventListener('playing', () => {
    showIdlePanel(false);
    setButton('Pause Live Video');
    setStatus('Live video connected.', 'is-live');
  });

  video.addEventListener('pause', () => {
    if (video.currentTime > 0 && !video.ended) {
      setButton('▶ Resume Live Video');
      setStatus('Live video paused.');
    }
  });

  video.addEventListener('waiting', () => {
    setStatus('Buffering the live video…');
  });

  video.addEventListener('error', () => {
    showIdlePanel(true);
    setButton('↻ Retry Live Video');
    setStatus('The live video is offline or temporarily unavailable.', 'is-error');
  });

  window.addEventListener('beforeunload', destroyPlayer);
})();
