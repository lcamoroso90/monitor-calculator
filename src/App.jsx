import React, { useState, useEffect, useMemo } from 'react';
import { Ruler, Type, Monitor, Info, Check, AlertTriangle, X, Eye, Users, Layout } from 'lucide-react';

const FONT_DATA = {
  "Roboto": { xHeight: 0.53, label: "Large" },
  "Inter": { xHeight: 0.55, label: "Large" },
  "Open Sans": { xHeight: 0.54, label: "Large" },
  "Lato": { xHeight: 0.51, label: "Neutral" },
  "Montserrat": { xHeight: 0.53, label: "Large" },
  "Arial": { xHeight: 0.52, label: "Neutral" },
  "Helvetica": { xHeight: 0.52, label: "Neutral" },
  "Times New Roman": { xHeight: 0.45, label: "Small" },
  "Georgia": { xHeight: 0.48, label: "Neutral" },
  "Verdana": { xHeight: 0.55, label: "Very Large" },
  "Merriweather": { xHeight: 0.50, label: "Neutral" },
  "Playfair Display": { xHeight: 0.45, label: "Small" },
  "Other/Generic": { xHeight: 0.50, label: "Standard" }
};

const SCREEN_PRESETS = {
  'Custom': { width: 1920, height: 1080, diagonal: 24, label: 'Custom Input' },
  '27" HD Monitor': { width: 1920, height: 1080, diagonal: 27, label: '27" HD Monitor (1080p)' },
  '32" HD Monitor': { width: 1920, height: 1080, diagonal: 32, label: '32" HD Monitor (1080p)' },
  '55" 4K TV': { width: 3840, height: 2160, diagonal: 55, label: '55" 4K Monitor (4K)' },
  '65" 4K TV': { width: 3840, height: 2160, diagonal: 65, label: '65" 4K Monitor (4K)' },
};

// Modified to only include the "Touch Interactives" requirement (21 pt)
const apparentAdaRequirements = [
  { name: "Touch Interactives", requiredPt: 21, distanceFt: 2, description: "Minimum required physical size for interactive text." },
];

// Function to calculate Greatest Common Divisor (GCD) for ratio simplification
const gcd = (a, b) => {
  // Ensure we are working with integers for GCD calculation
  a = Math.round(a); 
  b = Math.round(b);

  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-surface-container-low text-on-surface rounded-3xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 text-primary">
    {Icon && <Icon size={20} />}
    <h2 className="text-title-medium font-medium">{title}</h2>
  </div>
);

const App = () => {
  // --- State ---
  const [selectedPreset, setSelectedPreset] = useState('Custom');
  const [screenWidth, setScreenWidth] = useState(SCREEN_PRESETS['Custom'].width);
  const [screenHeight, setScreenHeight] = useState(SCREEN_PRESETS['Custom'].height);
  const [screenSize, setScreenSize] = useState(SCREEN_PRESETS['Custom'].diagonal); // diagonal inches
  const [designFontSize, setDesignFontSize] = useState(16); // px
  const [selectedFont, setSelectedFont] = useState("Roboto");
  const [viewDistFt, setViewDistFt] = useState(null); // Viewing distance in feet

  // Handle Preset change
  useEffect(() => {
    const preset = SCREEN_PRESETS[selectedPreset];
    if (preset) {
      setScreenWidth(preset.width);
      setScreenHeight(preset.height);
      setScreenSize(preset.diagonal);
      
      // Set default viewing distance to 2ft for non-custom monitor/TV presets
      if (['27" HD Monitor', '32" HD Monitor', '55" 4K TV', '65" 4K TV'].includes(selectedPreset)) {
        setViewDistFt(2);
      } else if (selectedPreset === 'Custom') {
        // Only set to null if the user hasn't provided input, otherwise keep previous
        if (viewDistFt === 2) setViewDistFt(null);
      }
    }
  }, [selectedPreset]);

  // --- Core Calculations ---
  const ppi = useMemo(() => {
    const diagonalPixels = Math.sqrt(Math.pow(screenWidth, 2) + Math.pow(screenHeight, 2));
    const calculatedPPI = diagonalPixels / screenSize;
    return isNaN(calculatedPPI) || !isFinite(calculatedPPI) ? 96 : calculatedPPI;
  }, [screenWidth, screenHeight, screenSize]);

  // Physical height in Points (pt) - 1 inch = 72 points
  const physicalSizePt = useMemo(() => {
    return (designFontSize / ppi) * 72;
  }, [designFontSize, ppi]);

  // Physical height of the full em-square in mm
  const physicalSizeMm = useMemo(() => {
    return (designFontSize / ppi) * 25.4;
  }, [designFontSize, ppi]);

  // Physical x-height in mm (the critical measure for readability)
  const physicalXHeightMm = useMemo(() => {
    const ratio = FONT_DATA[selectedFont]?.xHeight || 0.5;
    return physicalSizeMm * ratio;
  }, [physicalSizeMm, selectedFont]);
  
  // --- Derived Screen Dimensions (New Section) ---
  const derivedScreenDimensions = useMemo(() => {
    const w = screenWidth;
    const h = screenHeight;
    const d = screenSize;

    if (w <= 0 || h <= 0 || d <= 0) {
      return { aspectRatioRatio: 'N/A', widthInches: 0, heightInches: 0 };
    }

    // Aspect Ratio Ratio (e.g., 16:9)
    const divisor = gcd(w, h);
    const ratioW = w / divisor;
    const ratioH = h / divisor;
    const aspectRatioRatio = `${ratioW}:${ratioH}`;

    // Aspect Ratio Decimal (for internal use, not displayed)
    const arComponent = w / h;

    // H_in = D / sqrt( (W_px/H_px)^2 + 1 )
    const heightInches = d / Math.sqrt(Math.pow(arComponent, 2) + 1);
    const widthInches = arComponent * heightInches;

    return {
      aspectRatioRatio,
      widthInches,
      heightInches,
    };
  }, [screenWidth, screenHeight, screenSize]);

  // --- Viewing Distance Calculations ---
  
  // 5.1 Apparent PPI at Viewing Distance
  const apparentPpi = useMemo(() => {
    if (viewDistFt > 0) {
      // apparent_ppi = ppi * view_dist_ft (Note: This is based on spreadsheet convention)
      return ppi * viewDistFt; 
    }
    return null; 
  }, [ppi, viewDistFt]);

  // 5.2 Apparent Type Size at Viewing Distance (relative measure)
  const apparentTypePt = useMemo(() => {
    if (physicalSizePt && apparentPpi) {
      // apparent_type_pt = (type_pt * 108) / apparent_ppi
      return (physicalSizePt * 108) / apparentPpi;
    }
    return null; 
  }, [physicalSizePt, apparentPpi]);

  // 6.1 Minimum View Distance
  const minViewDistFt = useMemo(() => {
    return 80 / ppi;
  }, [ppi]);

  // 6.2 “Max Resolution” View Distance
  const maxResViewDistFt = useMemo(() => {
    return 412 / ppi;
  }, [ppi]);

  // 6.3 “Ideal” View Distance (THX-Style Approximation)
  const idealViewDistFt = useMemo(() => {
    // ideal_view_dist_ft = diag_in / (0.84 * 12)
    return screenSize / (0.84 * 12);
  }, [screenSize]);

  // --- ADA Physical Size Checks (Table data) ---
  const apparentAdaChecks = useMemo(() => {
      // Check based on the raw physical size (pt) against the fixed point requirement (21pt)
      return apparentAdaRequirements.map(req => {
          const physicalCheckPt = physicalSizePt; 
          // FIX: Changed physicalCheckCheckPt to physicalCheckPt (resolved prior error)
          const pass = physicalCheckPt !== null && physicalCheckPt >= req.requiredPt;
          return {
              ...req,
              physicalCheckPt,
              pass
          };
      });
  }, [physicalSizePt]);

  // --- Main Status Indicator (Now based on ADA compliance) ---
  const a11yStatus = useMemo(() => {
    const requiredPt = apparentAdaRequirements[0].requiredPt;
    const isCompliant = physicalSizePt !== null && physicalSizePt >= requiredPt;
    
    if (isCompliant) {
        return { 
            status: "compliant", 
            color: "text-success", 
            bg: "bg-success-container", 
            icon: Check, 
            msg: "ADA Compliant for Touch Interactives" 
        };
    } else {
        return { 
            status: "non-compliant", 
            color: "text-error", 
            bg: "bg-error-container", 
            icon: X, 
            msg: "Non-Compliant for Touch Interactives" 
        };
    }
  }, [physicalSizePt]);


  // Handler for manual input changes (resets preset to 'Custom')
  const handleManualInput = (setter) => (e) => {
    setter(Number(e.target.value));
    setSelectedPreset('Custom');
  };
  
  // Handler for viewing distance input
  const handleViewDistInput = (e) => {
    const value = e.target.value;
    // Set to null if empty string, otherwise convert to number
    setViewDistFt(value === '' ? null : Number(value));
  };

  // Get the Icon component from the status object
  const StatusIcon = a11yStatus.icon;


  return (
    <div className="min-h-screen bg-surface-light font-sans text-on-surface p-4 md:p-8 selection:bg-primary-container selection:text-on-primary-container">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header */}
        <div className="lg:col-span-12 mb-4">
          <h1 className="text-display-small text-primary font-bold mb-2">Type Size Calculator</h1>
          <p className="text-body-large text-on-surface-variant max-w-2xl">
            Ensure your typography is legible across devices. Calculate physical type size, verify ADA compliance, and analyze viewing distances.
          </p>
        </div>

        {/* --- LEFT COLUMN: INPUTS --- */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <SectionTitle icon={Monitor} title="Screen Dimensions & Viewing Distance" />
            <div className="space-y-4">
               {/* Preset Selector */}
               <div className="flex flex-col gap-1">
                  <label className="text-label-large text-on-surface-variant">Preset Screen Size</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {Object.keys(SCREEN_PRESETS).map(key => (
                      <option key={key} value={key}>{SCREEN_PRESETS[key].label}</option>
                    ))}
                  </select>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-large text-on-surface-variant">Width (px)</label>
                  <input 
                    type="number" 
                    value={screenWidth}
                    onChange={handleManualInput(setScreenWidth)}
                    disabled={selectedPreset !== 'Custom'}
                    className={`bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors ${selectedPreset !== 'Custom' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-large text-on-surface-variant">Height (px)</label>
                  <input 
                    type="number" 
                    value={screenHeight} 
                    onChange={handleManualInput(setScreenHeight)}
                    disabled={selectedPreset !== 'Custom'}
                    className={`bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors ${selectedPreset !== 'Custom' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-label-large text-on-surface-variant">Diagonal Size (inches)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={screenSize} 
                    onChange={handleManualInput(setScreenSize)}
                    disabled={selectedPreset !== 'Custom'}
                    className={`w-full bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors ${selectedPreset !== 'Custom' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  <span className="absolute right-3 top-2 text-on-surface-variant text-sm">in</span>
                </div>
              </div>
              
              {/* Viewing Distance Input */}
              <div className="flex flex-col gap-1">
                <label className="text-label-large text-on-surface-variant">Viewing Distance (feet)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={viewDistFt === null ? '' : viewDistFt} 
                    onChange={handleViewDistInput}
                    placeholder="e.g., 2 (default for presets)"
                    className="w-full bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors"
                  />
                  <span className="absolute right-3 top-2 text-on-surface-variant text-sm">ft</span>
                </div>
              </div>

              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg text-body-medium flex justify-between items-center">
                <span>Calculated Density:</span>
                <span className="font-bold font-mono">{Math.round(ppi)} PPI</span>
              </div>
            </div>
          </Card>
          
          {/* NEW: Screen Geometry Card */}
          <Card>
             <SectionTitle icon={Layout} title="Screen Geometry" />
             <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-surface-light rounded-xl">
                   <p className="text-label-medium text-on-surface-variant">Aspect Ratio</p>
                   <p className="text-title-large font-bold text-on-surface mt-1">{derivedScreenDimensions.aspectRatioRatio}</p> {/* Updated to show ratio */}
                </div>
                <div className="p-3 bg-surface-light rounded-xl">
                   <p className="text-label-medium text-on-surface-variant">Width (in)</p>
                   <p className="text-title-large font-bold text-on-surface mt-1">{derivedScreenDimensions.widthInches.toFixed(2)}</p> {/* Updated to 2 decimal places */}
                </div>
                <div className="p-3 bg-surface-light rounded-xl">
                   <p className="text-label-medium text-on-surface-variant">Height (in)</p>
                   <p className="text-title-large font-bold text-on-surface mt-1">{derivedScreenDimensions.heightInches.toFixed(2)}</p> {/* Updated to 2 decimal places */}
                </div>
             </div>
          </Card>


          <Card>
            <SectionTitle icon={Type} title="Typography Settings" />
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-large text-on-surface-variant">Design Tool Font Size (px/pt)</label>
                <input 
                  type="number" 
                  value={designFontSize} 
                  onChange={(e) => setDesignFontSize(Number(e.target.value))}
                  className="bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-large text-on-surface-variant">Font Family</label>
                <select 
                  value={selectedFont} 
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full bg-surface-light border-b-2 border-outline-variant focus:border-primary px-3 py-2 rounded-t-lg outline-none transition-colors appearance-none cursor-pointer"
                >
                  {Object.keys(FONT_DATA).map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              {/* Font Insight Chip */}
              <div className={`mt-2 p-3 rounded-xl flex items-start gap-3 ${FONT_DATA[selectedFont].label === 'Large' || FONT_DATA[selectedFont].label === 'Very Large' ? 'bg-green-100 text-green-900' : FONT_DATA[selectedFont].label === 'Small' ? 'bg-orange-100 text-orange-900' : 'bg-surface-variant text-on-surface-variant'}`}>
                 <Info size={18} className="mt-0.5 shrink-0"/>
                 <div className="text-body-small">
                    <span className="font-bold block mb-1">X-Height Analysis: {FONT_DATA[selectedFont].label}</span>
                    {FONT_DATA[selectedFont].label === 'Small' 
                      ? "This font has short lowercase letters. It will appear visually smaller than standard fonts."
                      : FONT_DATA[selectedFont].label === 'Large' || FONT_DATA[selectedFont].label === 'Very Large'
                      ? "This font has tall lowercase letters, making it highly legible at smaller sizes."
                      : "This font has standard proportions."}
                 </div>
              </div>
            </div>
          </Card>
        </div>

        {/* --- RIGHT COLUMN: RESULTS --- */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Result Hero */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-primary-container text-on-primary-container h-full flex flex-col justify-between relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
                 <Ruler size={140} />
               </div>
              <div>
                <h3 className="text-title-medium opacity-90 mb-1">Physical Size on Screen</h3>
                
                {/* Points Display (Total Height) */}
                <div className="flex items-baseline gap-2">
                  <span className="text-display-medium font-bold">{physicalSizePt.toFixed(1)}</span>
                  <span className="text-title-large opacity-80">pt (approx)</span>
                </div>

                <p className="text-label-large opacity-70 mt-2">Total Height (Em Square)</p>
              </div>
              <div className="mt-6 pt-6 border-t border-on-primary-container/20">
                 <h3 className="text-title-medium opacity-90 mb-1">Visual X-Height</h3>
                 <div className="flex items-baseline gap-2">
                  <span className="text-display-small font-bold">{physicalXHeightMm.toFixed(2)}</span>
                  <span className="text-title-medium">mm</span>
                </div>
                 <p className="text-label-large opacity-70 mt-1">Height of lowercase 'x'</p>
              </div>
            </Card>

            <Card className={`${a11yStatus.bg} ${a11yStatus.color} h-full flex flex-col justify-center items-center text-center`}>
              {/* FIX: Render StatusIcon component instead of object reference */}
              <StatusIcon size={48} className="mb-4" /> 
              <h3 className="text-headline-small font-bold mb-2">{a11yStatus.msg}</h3>
              <p className="text-body-medium max-w-[80%] opacity-90">
                {a11yStatus.status === 'non-compliant' && `The required minimum size for touch interactives is ${apparentAdaRequirements[0].requiredPt.toFixed(0)} pt. This size fails the compliance check.`}
                {a11yStatus.status === 'compliant' && "This type size meets the minimum physical requirements for ADA compliant touch interactive elements."}
              </p>
            </Card>
          </div>
          
          {/* New: Viewing Distance Analysis */}
          <Card>
            <SectionTitle icon={Eye} title="Viewing Distance Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Recommended Distances */}
              <div className="lg:col-span-1 space-y-3 p-4 border border-outline-variant rounded-2xl">
                 <h4 className="text-title-small text-primary mb-2">Recommended Distances</h4>
                 
                 <div className="border-b border-outline-variant/50 pb-2">
                    <p className="text-label-large text-on-surface-variant">Minimum View Distance</p>
                    <p className="text-title-large font-bold text-on-surface">{minViewDistFt.toFixed(1)} ft</p>
                    <p className="text-body-small text-on-surface-variant">Prevents pixel perception (based on PPI).</p>
                 </div>
                 <div className="border-b border-outline-variant/50 pb-2">
                    <p className="text-label-large text-on-surface-variant">Max Resolution View Distance</p>
                    <p className="text-title-large font-bold text-on-surface">{maxResViewDistFt.toFixed(1)} ft</p>
                    <p className="text-body-small text-on-surface-variant">Max distance for perceiving full screen detail (based on PPI).</p>
                 </div>
                 <div>
                    <p className="text-label-large text-on-surface-variant">Ideal View Distance (THX)</p>
                    <p className="text-title-large font-bold text-on-surface">{idealViewDistFt.toFixed(1)} ft</p>
                    <p className="text-body-small text-on-surface-variant">Optimal for an immersive field of view (based on diagonal size).</p>
                 </div>
              </div>

              {/* Apparent Size Results */}
              <div className="lg:col-span-2 space-y-4 p-4 bg-surface-light rounded-2xl">
                 {/* FIX: Simplified interpolation logic in h4 to resolve JSX parsing error */}
                 <h4 className="text-title-small text-primary mb-3">Apparent Type Metrics (at {viewDistFt > 0 ? viewDistFt + ' ft' : 'your distance'})</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-label-medium text-on-surface-variant">Apparent PPI</p>
                      <p className="text-headline-small font-bold text-on-surface">
                        {apparentPpi !== null ? apparentPpi.toFixed(0) : <span className="text-on-surface-variant/50">-</span>}
                      </p>
                      <p className="text-body-small text-on-surface-variant mt-1">PPI $\times$ Viewing Distance (ft)</p>
                   </div>
                   
                   <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-label-medium text-on-surface-variant">Apparent Type Size</p>
                      <p className="text-headline-small font-bold text-on-surface">
                        {apparentTypePt !== null ? apparentTypePt.toFixed(1) : <span className="text-on-surface-variant/50">-</span>} pt
                      </p>
                      <p className="text-body-small text-on-surface-variant mt-1">Perceived size relative to $18$ " reading distance.</p>
                   </div>
                 </div>
                 
                 {viewDistFt === null && (
                   <p className="text-body-small text-on-surface-variant p-2 bg-secondary-container/50 rounded-lg">
                    Enter a viewing distance in feet above to calculate the Apparent PPI and Apparent Type Size.
                   </p>
                 )}
              </div>
            </div>
          </Card>

          {/* Updated: ADA Physical Size Check */}
          <Card>
            <SectionTitle icon={Users} title="ADA Physical Size Check (Compliance)" />
            <p className="text-body-medium text-on-surface-variant mb-4">
               Checks if the raw **Physical Size on Screen ({physicalSizePt.toFixed(1)} pt)** meets the fixed minimum point size requirements for interactive kiosks and close viewing applications.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="py-3 px-2 text-label-large text-on-surface font-semibold">Category</th>
                    <th className="py-3 px-2 text-label-large text-on-surface font-semibold">Required Min Pt</th>
                    <th className="py-3 px-2 text-label-large text-on-surface font-semibold">@ Apparent Distance (ft)</th>
                    <th className="py-3 px-2 text-label-large text-on-surface font-semibold">Physical Size Pt</th>
                    <th className="py-3 px-2 text-label-large text-on-surface font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-medium">
                  {apparentAdaChecks.map((req, index) => (
                    <tr key={index} className="border-b border-outline-variant/50 last:border-b-0">
                      <td className="py-3 px-2 whitespace-nowrap">
                         <span className="font-medium">{req.name}</span>
                         <span className="block text-body-small text-on-surface-variant italic">{req.description}</span>
                      </td>
                      <td className="py-3 px-2">{req.requiredPt} pt</td>
                      <td className="py-3 px-2">{req.distanceFt} ft</td>
                      <td className="py-3 px-2 font-mono">{req.physicalCheckPt !== null ? req.physicalCheckPt.toFixed(1) : '-'} pt</td>
                      <td className="py-3 px-2">
                        {req.pass
                          ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-label-small font-bold"><Check size={12}/> Pass</span>
                          : <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-label-small font-bold"><X size={12}/> Fail</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
        </div>
      </div>

      {/* Tailwind Custom Styles for Material Tokens (simulated) */}
      <style>{`
        .bg-surface-light { background-color: #F3F4F7; }
        .bg-surface-container-low { background-color: #FFFFFF; }
        
        .text-on-surface { color: #2A303E; }
        .text-on-surface-variant { color: #536070; }
        
        .text-primary { color: #015A8D; }
        .bg-primary-container { background-color: #019FF9; }
        .text-on-primary-container { color: #FFFFFF; }
        
        .bg-secondary-container { background-color: #FFD95C; }
        .text-on-secondary-container { color: #2A303E; }
        
        .bg-surface-variant { background-color: #DEE1E6; }

        .text-error { color: #ba1a1a; }
        .bg-error-container { background-color: #ffdad6; }
        .text-on-error-container { color: #410002; }

        /* Custom Success Green for Compliance */
        .text-success { color: #006C4C; }
        .bg-success-container { background-color: #A3F5CF; }

        .border-outline-variant { border-color: #D3D6DB; }
        
        /* Material Typography Scale (Approx) */
        .text-display-large { font-size: 57px; line-height: 64px; letter-spacing: -0.25px; }
        .text-display-medium { font-size: 45px; line-height: 52px; }
        .text-display-small { font-size: 36px; line-height: 44px; }
        .text-headline-large { font-size: 32px; line-height: 40px; }
        .text-headline-medium { font-size: 28px; line-height: 36px; }
        .text-headline-small { font-size: 24px; line-height: 32px; }
        .text-title-large { font-size: 22px; line-height: 28px; }
        .text-title-medium { font-size: 16px; line-height: 24px; letter-spacing: 0.15px; }
        .text-body-large { font-size: 16px; line-height: 24px; letter-spacing: 0.5px; }
        .text-body-medium { font-size: 14px; line-height: 20px; letter-spacing: 0.25px; }
        .text-body-small { font-size: 12px; line-height: 16px; letter-spacing: 0.4px; }
        .text-label-large { font-size: 14px; line-height: 20px; letter-spacing: 0.1px; font-weight: 500; }
        .text-label-medium { font-size: 12px; line-height: 16px; letter-spacing: 0.5px; font-weight: 500; }
        .text-label-small { font-size: 11px; line-height: 16px; letter-spacing: 0.5px; font-weight: 500; }
      `}</style>
    </div>
  );
};

export default App;
