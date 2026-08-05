import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Clock, Volume2, VolumeX } from 'lucide-react';

export default function TVPanel({ user, onBack }) {
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const tableContainerRef = useRef(null);
  const previousSurgeriesRef = useRef([]);
  const audioCtxRef = useRef(null);

  const getAudioContext = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch (e) {
      console.error('AudioContext init error:', e);
      return null;
    }
  };

  const playSynthChime = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      
      // Tom 1 (E5 - 659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tom 2 (A5 - 880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.6, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.error('Erro na síntese de áudio:', e);
    }
  };

  useEffect(() => {
    const unlockAudio = () => {
      getAudioContext();
      setSoundEnabled(true);
      soundEnabledRef.current = true;
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const playNotificationSound = () => {
    try {
      getAudioContext();
      const audio = new Audio('/notification.mp3');
      audio.volume = 1.0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const audioWav = new Audio('/notification.wav');
          audioWav.volume = 1.0;
          audioWav.play().catch(() => {
            playSynthChime();
          });
        });
      }
    } catch (err) {
      console.error("Audio error: ", err);
      playSynthChime();
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabledRef.current;
    getAudioContext();
    setSoundEnabled(newState);
    soundEnabledRef.current = newState;
    if (newState) {
      playNotificationSound(); // Toca um som de teste ao ativar
    }
  };

  const fetchSurgeries = async () => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const tenDaysLater = new Date(today);
      tenDaysLater.setDate(today.getDate() + 10);
      const endYyyy = tenDaysLater.getFullYear();
      const endMm = String(tenDaysLater.getMonth() + 1).padStart(2, '0');
      const endDd = String(tenDaysLater.getDate()).padStart(2, '0');
      const endDateStr = `${endYyyy}-${endMm}-${endDd}`;

      let query = supabase
        .from('surgeries')
        .select('*')
        .gte('date', todayStr)
        .lte('date', endDateStr)
        .not('status', 'ilike', 'FINALIZADA')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      const fetchedData = data || [];

      if (previousSurgeriesRef.current.length > 0) {
        const previousIds = new Set(previousSurgeriesRef.current.map(s => s.id));
        const newSurgeriesCount = fetchedData.filter(s => !previousIds.has(s.id)).length;
        if (newSurgeriesCount > 0 && soundEnabledRef.current) {
          let count = 0;
          playNotificationSound(); // Toca a primeira vez imediatamente
          count++;
          if (count < newSurgeriesCount) {
            const playInterval = setInterval(() => {
              playNotificationSound();
              count++;
              if (count >= newSurgeriesCount) {
                clearInterval(playInterval);
              }
            }, 1500); // 1.5 segundos entre os toques
          }
        }
      }

      previousSurgeriesRef.current = fetchedData;
      setSurgeries(fetchedData);
    } catch (err) {
      console.error('Erro ao buscar cirurgias no Painel TV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurgeries();

    // Inscrição Realtime via WebSocket para alertas instantâneos ao inserir cirurgias
    const channel = supabase
      .channel('tv-panel-surgeries-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surgeries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (soundEnabledRef.current) {
            playNotificationSound();
          }
        }
        fetchSurgeries();
      })
      .subscribe();

    // Refresh a cada 10 segundos como segurança
    const interval = setInterval(() => {
      fetchSurgeries();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (loading || surgeries.length === 0) return;

    const container = tableContainerRef.current;
    if (!container) return;

    // Check if scrolling is needed
    if (container.scrollHeight <= container.clientHeight) {
      return; // No need to scroll if content fits
    }

    const step = 1; // pixels per frame
    const intervalTime = 50; // ms between frames

    // Add a small delay before starting to scroll, and when reaching top/bottom
    let isPaused = false;

    const scrollInterval = setInterval(() => {
      if (isPaused) return;

      // When we hit the bottom
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
        isPaused = true;
        setTimeout(() => {
          container.scrollTop = 0;
          setTimeout(() => {
            isPaused = false;
          }, 2000); // Wait 2s at the top before scrolling again
        }, 3000); // Wait 3s at the bottom before resetting
      } else {
        container.scrollTop += step;
      }
    }, intervalTime);

    return () => clearInterval(scrollInterval);
  }, [loading, surgeries]);

  const getRowClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('entregue')) return 'tv-row-green';
    if (s.includes('suspensa')) return 'tv-row-red';
    if (s.includes('em separação') || s.includes('separacao') || s.includes('separação')) return 'tv-row-blue';
    if (s.includes('separado') || s.includes('entrega')) return 'tv-row-orange';
    if (s.includes('urgência') || s.includes('urgencia')) return 'tv-row-purple';
    if (s.includes('agendada')) return 'tv-row-purple';
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao') || s.includes('autorizada')) return 'tv-row-yellow';
    if (s.includes('eletiva')) return 'tv-row-gray';
    if (s.includes('finalizada')) return 'tv-row-teal';
    if (s.includes('material retornado')) return 'tv-row-pink';
    return 'tv-row-default';
  };

  const formatBrazilianDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="tv-panel-container">
      {loading && surgeries.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', height: '100vh', justifyContent: 'center' }}>
          <Clock className="animate-spin" size={48} style={{ color: '#fff', marginRight: '15px' }} />
          <h2 style={{ color: '#fff' }}>Carregando Painel TV...</h2>
        </div>
      ) : (
        <>
          {!soundEnabled && (
            <div 
              onClick={toggleSound}
              style={{
                backgroundColor: '#ef4444',
                color: 'var(--bg-secondary)',
                padding: '8px 16px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                animation: 'pulse 2s infinite'
              }}
            >
              <VolumeX size={18} /> ⚠️ ÁUDIO INATIVO: Clique em qualquer lugar na tela do Painel TV para ATIVAR O SOM automático dos alertas.
            </div>
          )}
          <div className="tv-panel-header">
            <button className="btn-secondary" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0,0,0,0.05)', color: '#374151', border: '1px solid #d1d5db' }}>
              <ArrowLeft size={18} /> Sair do Painel TV
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flex: 1 }}>
              <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '45px', objectFit: 'contain' }} />
              <h1 style={{ margin: 0, color: '#1f2937', fontSize: '1.6rem', fontWeight: 'bold' }}>Mapa de Cirurgias</h1>
            </div>
            <div style={{ minWidth: '160px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#374151' }}>
                Total: {surgeries.length}
              </span>
              <button
                onClick={toggleSound}
                style={{ background: 'none', border: 'none', color: soundEnabled ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginTop: '4px', fontWeight: 'bold' }}
                title="Clique para ativar/desativar alertas sonoros"
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                {soundEnabled ? 'Som Ativado' : 'Som Inativo (Clique aqui)'}
              </button>
            </div>
          </div>

          <div className="tv-table-container" ref={tableContainerRef}>
            <table className="tv-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Status</th>
                  <th>Paciente</th>
                  <th>Hospital</th>
                  <th>Médico</th>
                  <th>Convênio</th>
                  <th>Material / Tipo</th>
                  <th>Vendedor</th>
                  <th>Instr.</th>
                </tr>
              </thead>
              <tbody>
                {surgeries.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                      Nenhuma cirurgia agendada para os próximos 10 dias.
                    </td>
                  </tr>
                ) : (
                  surgeries.map(surgery => (
                    <tr key={surgery.id} className={getRowClass(surgery.status)}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatBrazilianDate(surgery.date)} {surgery.time ? <br /> : ''} {surgery.time}</td>
                      <td style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{surgery.status || '-'}</td>
                      <td>{surgery.patient}</td>
                      <td>{surgery.hospital || '-'}</td>
                      <td>{surgery.doctor || '-'}</td>
                      <td>{surgery.insurance || '-'}</td>
                      <td>{surgery.material_procedure || surgery.surgery_type || '-'}</td>
                      <td>{surgery.salesperson || '-'}</td>
                      <td>
                        {surgery.instrumentalist1 || '-'}
                        {surgery.instrumentalist2 ? <><br />{surgery.instrumentalist2}</> : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
