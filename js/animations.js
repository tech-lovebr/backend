/**
 * LOVE Marketplace - UI Animations & Microinteractions
 */

const LoveAnimations = {
  /**
   * Executa uma sequência fluida de carregamento da IA com etapas dinâmicas
   * @param {Function} onComplete Callback chamado ao finalizar o processamento da IA
   */
  simulateAiProcessing: function(onComplete) {
    const steps = window.LOVE_DATA.aiLoadingSteps;
    const textEl = document.getElementById('ai-loading-text');
    const iconEl = document.getElementById('ai-loading-icon');
    const progressBar = document.getElementById('ai-progress-fill');
    const percentEl = document.getElementById('ai-percent-text');

    let currentStep = 0;

    function runNextStep() {
      if (currentStep < steps.length) {
        const step = steps[currentStep];

        // Animação de fade no texto
        if (textEl) {
          textEl.style.opacity = '0';
          textEl.style.transform = 'translateY(6px)';

          setTimeout(() => {
            textEl.textContent = step.text;
            if (iconEl) iconEl.textContent = step.icon;
            textEl.style.opacity = '1';
            textEl.style.transform = 'translateY(0)';
          }, 180);
        }

        // Atualização da barra de progresso
        if (progressBar) {
          progressBar.style.width = `${step.progress}%`;
        }
        if (percentEl) {
          percentEl.textContent = `${step.progress}%`;
        }

        currentStep++;

        // Intervalo dinâmico para simular cálculo neural
        const nextDelay = currentStep === steps.length ? 1000 : 700 + Math.random() * 400;
        setTimeout(runNextStep, nextDelay);
      } else {
        // Conclusão
        if (typeof onComplete === 'function') {
          setTimeout(onComplete, 400);
        }
      }
    }

    runNextStep();
  },

  /**
   * Efeito de confetes/corações flutuantes ao concluir a recomendação ou pedido
   */
  triggerHeartConfetti: function(targetContainer) {
    const container = targetContainer || document.body;
    const emojis = ['💖', '✨', '🌸', '🎁', '🌹', '💕'];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.position = 'fixed';
      particle.style.left = `${15 + Math.random() * 70}vw`;
      particle.style.top = `${60 + Math.random() * 30}vh`;
      particle.style.fontSize = `${16 + Math.random() * 20}px`;
      particle.style.opacity = '1';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      particle.style.transition = 'all 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)';

      container.appendChild(particle);

      requestAnimationFrame(() => {
        const moveX = (Math.random() - 0.5) * 160;
        const moveY = -180 - Math.random() * 220;
        const rotate = (Math.random() - 0.5) * 180;
        particle.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg) scale(1.3)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1500);
    }
  }
};

// Export global
window.LoveAnimations = LoveAnimations;
