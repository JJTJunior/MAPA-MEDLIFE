import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, FlipHorizontal, Trash2, Zap, ZapOff } from 'lucide-react';
import { jsPDF } from 'jspdf';

const DocumentScanner = ({ onFinish, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  // Initialize camera
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      setHasFlash(!!capabilities.torch);
      setIsFlashOn(false);

    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("Não foi possível acessar a câmera. Verifique se o navegador tem permissão.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        if (isFlashOn && track.applyConstraints) {
           track.applyConstraints({ advanced: [{ torch: false }] }).catch(e => console.error(e));
        }
        track.stop();
      });
    }
  };

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    
    if (!capabilities.torch) {
      alert("Seu dispositivo ou navegador não suporta ativar o flash por aqui.");
      return;
    }

    try {
      await track.applyConstraints({
        advanced: [{ torch: !isFlashOn }]
      });
      setIsFlashOn(!isFlashOn);
    } catch (err) {
      console.error("Erro ao ativar lanterna", err);
      alert("Erro ao ativar a lanterna.");
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to high-quality JPEG
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImages(prev => [...prev, imageDataUrl]);
  };

  const removePhoto = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    if (capturedImages.length === 0) return;
    setIsGeneratingPdf(true);
    
    try {
      // Create a new jsPDF instance (portrait by default, A4 size is common for documents)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < capturedImages.length; i++) {
        const imgData = capturedImages[i];
        
        // Add a new page for every image except the first one
        if (i > 0) {
          pdf.addPage();
        }
        
        // Get image dimensions to scale properly
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        const imgRatio = img.width / img.height;
        const pageRatio = pageWidth / pageHeight;
        
        let renderWidth = pageWidth;
        let renderHeight = pageHeight;
        let x = 0;
        let y = 0;
        
        if (imgRatio > pageRatio) {
          // Image is wider than page (relative to its height)
          renderHeight = pageWidth / imgRatio;
          y = (pageHeight - renderHeight) / 2;
        } else {
          // Image is taller than page
          renderWidth = pageHeight * imgRatio;
          x = (pageWidth - renderWidth) / 2;
        }
        
        pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight);
      }
      
      // Get the PDF as a Blob
      const pdfBlob = pdf.output('blob');
      
      // Pass the blob to the parent component
      onFinish(pdfBlob);
      
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: '#000', zIndex: 10000, display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, width: '100%', zIndex: 10
      }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={28} />
        </button>
        <span style={{ color: 'white', fontWeight: 'bold' }}>
          {capturedImages.length} {capturedImages.length === 1 ? 'página' : 'páginas'}
        </span>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={toggleFlash} style={{ background: 'none', border: 'none', color: isFlashOn ? '#eab308' : 'white', cursor: 'pointer' }}>
            {isFlashOn ? <Zap size={28} /> : <ZapOff size={28} />}
          </button>
          <button onClick={toggleCamera} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <FlipHorizontal size={28} />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Hidden canvas for taking photos */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Helper overlay for document scanning (a rectangle) */}
        <div style={{
          position: 'absolute',
          top: '10%', left: '10%', width: '80%', height: '80%',
          border: '2px solid rgba(255,255,255,0.5)',
          borderRadius: '8px',
          pointerEvents: 'none'
        }}></div>
      </div>

      {/* Captured Thumbnails Strip */}
      {capturedImages.length > 0 && (
        <div style={{
          height: '100px', backgroundColor: '#1e293b', padding: '12px',
          display: 'flex', gap: '12px', overflowX: 'auto', alignItems: 'center'
        }}>
          {capturedImages.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
              <img src={img} alt={`Página ${idx + 1}`} style={{ height: '76px', width: '54px', objectFit: 'cover', borderRadius: '4px', border: '2px solid white' }} />
              <div 
                style={{ position: 'absolute', bottom: -5, right: -5, backgroundColor: 'white', color: 'black', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}
              >
                {idx + 1}
              </div>
              <button 
                onClick={() => removePhoto(idx)}
                style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer Controls */}
      <div style={{
        padding: '24px', backgroundColor: '#0f172a', display: 'flex', 
        justifyContent: 'center', alignItems: 'center', gap: '40px', paddingBottom: '40px'
      }}>
        
        {/* Capture Button */}
        <button 
          onClick={capturePhoto}
          style={{
            width: '72px', height: '72px', borderRadius: '50%', 
            backgroundColor: 'transparent', border: '4px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white' }}></div>
        </button>

        {/* Finish Button */}
        {capturedImages.length > 0 && (
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            style={{
              position: 'absolute', right: '24px',
              backgroundColor: '#10b981', color: 'white', border: 'none',
              borderRadius: '50%', width: '56px', height: '56px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
            }}
          >
            {isGeneratingPdf ? <span style={{fontSize:'10px', fontWeight:'bold'}}>PDF...</span> : <Check size={28} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentScanner;
