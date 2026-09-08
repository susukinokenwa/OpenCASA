"use strict";

// Constants----------------------------
const CANVAS_W = 660, CANVAS_H = 400;
const FIELD_L = 90, FIELD_R = CANVAS_W - 90;
const DEMO_FRAMES = 80;
const RAW_CELL_COUNT = 46;// fake demo cells count
const MAX_VIDEO_FRAMES = 80;   // cap on how many frames we extract from an uploaded video
const ANALYSIS_MAX_W = 1920;   // hard ceiling only - we analyze at the video's native resolution


const COLORS = { PR: "#34d399", NP: "#f59e0b", IM: "#ef4444" };
const LABEL_TABLE = { PR: "PR", NP: "NP", IM: "IM" };
const LABEL_CSV = { PR: "progressive", NP: "non-progressive", IM: "immotile" };

function rand(max, min){// randomize data for demo
    return min + Math.random() * (max - min);
}

// calculates the average of the array, can be used for VCL, etc.
function avg(arr){ 
    if(arr.length) return arr.reduce((a,b) => {a+b},0)/arr.length;
    return 0;
}
function choice(weights){
  const r = Math.random(); let acc = 0;
  for(const [k,w] of weights){ acc += w; if(r <= acc) return k; }
  return weights[weights.length-1][0];
}

// filters out invalid display for invalid numbers such as NaN etc and displays "-" instead...
function fmt(v,d=1){ 
    if(v === undefined || v === null || isNaN(v)) {
        return "-" 
    }
    return v.toFixed(d); 
}

// parameters from html or default
let params = {
  threshold: 30, 
  calibration: 1.2, 
  frameRate: 60,
  minArea: 10, 
  maxArea: 100, 
  searchRadius: 25, 
  minPathLength: 10,
  prVAP: 25, 
  prSTR: 0.8, 
  motileVCL: 5,
  invertImage: true, 
  backgroundSubtraction: true
};

let sourceType = "none";     // "none" / "demo" / "video"
let N_FRAMES = DEMO_FRAMES;  // active frame count for playback slider

// holds fake cells for demo vid
let rawCells = null;

// video mode
let videoFrames = null;      // array of ImageData (native-resolution, or downscaled only if huge), per captured frame
let workDims = {w: 220, h: 150};

let analyzed = false;// flag if analyzed
let currentFrame = 0; // which frame is video on
let playing = false; // is video animating
let playTimer = null; // current time frame, used to play or stop
let showBinary = false; // if the binary checkbox is checked or not

let analysisRows = [];   // {cell, path, metrics, cls}
let validRows = []; // analysisRows with invalid cells being filtered..

// Demo Generation----------------------------------
function generateRawCells(){
    const cells = [];
    for(let i = 0; i < RAW_CELL_COUNT; i++){
        //randomize cell type
        const kind = choice([["fast", 0.38], ["wobbly", 0.42], ["still", 0.2]]);
        // how many px it swims perframe, amplitude of side to side movememnt, how fast it wobbles
        let driftPxFrame, ampPx, freqHz; 
        if(kind === "fast"){
            driftPxFrame = rand(1.4, 3.3); 
            ampPx = rand(1.6, 3.8); 
            freqHz = rand(10, 22);
        } else if(kind === "wobbly"){
            driftPxFrame = rand(0.05, 0.55); 
            ampPx = rand(3.5, 8.5); 
            freqHz = rand(8, 20);
        } else {
            driftPxFrame = rand(0, 0.05); 
            ampPx = rand(0.4, 1.6); 
            freqHz = rand(1, 6);
        }
        
        const isDebris = Math.random() < 0.13; // 13% chance itwill be dead cells or smt like that
        // area of cell, if is Debris, its either a small one, or a extremely huge one
        const area = isDebris ? (Math.random() < 0.5 ? rand(2, 9) : rand(102, 160)) : rand(24, 52);
        // a rectangular box containing the cell
        const width = Math.sqrt(area) * rand(0.85, 1.1);
        const height = Math.sqrt(area) * rand(0.85, 1.1);
        const circularity = isDebris ? rand(0.45, 0.76) : rand(0.82,0.96); // how much the rectangle is filled
        // brightness of cell
        const lowIntensity = Math.random() < 0.16;
        const intensity = lowIntensity ? rand(4,26) : rand(35,96);
        // if the cell have a short track 
        const shortTrack = Math.random() < 0.22;
        const trackLength = shortTrack ? Math.round(rand(5,78)) : DEMO_FRAMES;

        //push ro array
        cells.push({
        id:i+1,
        startX:rand(FIELD_L+20, FIELD_R-20),
        startY:rand(30, CANVAS_H-30),
        angle:rand(0, Math.PI*2),
        phase:rand(0, Math.PI*2),
        driftPxFrame, ampPx, freqHz,
        area, width, height, circularity, intensity, trackLength
        });
    }
    //return array of generated cells
    return cells;

}

function cellPath(cell){
    const pts = [];
    // forward direction ( angle)
    const dx = Math.cos(cell.angle);
    const dy = Math.sin(cell.angle);
    //perpendicular direction (unit vector)
    const px = -Math.sin(cell.angle);
    const py = Math.cos(cell.angle);

    for(let t = 0; t < cell.trackLength; t++){
        const wob = Math.sin(2 * Math.PI * cell.freqHz * (t/60) + cell.phase);
        const x = cell.startX + dx * cell.driftPxFrame * t + px * cell.ampPx * wob;
        const y = cell.startY + dy * cell.driftPxFrame * t + py * cell.ampPx * wob;
        pts.push([x,y]);
    }
    return pts;
}

function computeMetrics(path, p){
    const n = path.length;
    const durationSec = n / p.frameRate;
    // if the cell dont even have 2 pts, it means its not moving. so everything is 0
    if(n < 2) return {VCL:0, VSL:0, VAP:0, LIN:0, STR:0, WOB:0, ALH:0, BCF:0};

    // vcl, point to point
    let vclPx = 0;
    for(let i = 1; i < n; i++) {
        vclPx += Math.hypot(path[i][0] - path[i-1][0], path[i][1] - path[i-1][1]);
    }
    // vsl : final - initial
    const vslPx = Math.hypot(path[n-1][0]-path[0][0], path[n-1][1]-path[0][1]);

    // window for how much pts averaged together
    const win = Math.max(3, Math.min(n, Math.round(p.frameRate/6)));
    const smoothed = [];
    for(let i = 0; i < n; i++){
        // pts frame but with limits in case it crash ar edges
        const lo = Math.max(0, i - Math.floor(win / 2));
        const hi = Math.min(n, i + Math.ceil(win / 2));
        //saving pts
        let sx = 0, sy = 0;
        for(let j = lo; j < hi; j++){ 
            sx += path[j][0]; 
            sy += path[j][1]; 
        }
        smoothed.push([sx / (hi - lo), sy / (hi - lo)]);
    }

    // vap
    let vapPx = 0;
    for(let i=1;i<n;i++) {
        vapPx += Math.hypot(smoothed[i][0]-smoothed[i-1][0], smoothed[i][1]-smoothed[i-1][1]);
    }

    const VCL = (vclPx * p.calibration) / durationSec;
    const VSL = (vslPx * p.calibration) / durationSec;
    const VAP = (vapPx * p.calibration) / durationSec;
    const LIN = VCL > 0 ? VSL / VCL : 0;
    const STR = VAP > 0 ? VSL / VAP : 0;
    const WOB = VCL > 0 ? VAP / VCL : 0;

    let devs = [];
    for(let i=0;i<n;i++) devs.push(Math.hypot(path[i][0]-smoothed[i][0], path[i][1]-smoothed[i][1]));
    const meanDev = avg(devs);
    const ALH = meanDev*2*p.calibration;

    const lateral = [];
    for(let i=0;i<n;i++){
        const i0 = Math.max(0,i-1), i1 = Math.min(n-1,i+1);
        const tx = smoothed[i1][0]-smoothed[i0][0], ty = smoothed[i1][1]-smoothed[i0][1];
        const len = Math.hypot(tx,ty)||1;
        const nx = -ty/len, ny = tx/len;
        lateral.push((path[i][0]-smoothed[i][0])*nx + (path[i][1]-smoothed[i][1])*ny);
    }
    let crossings = 0;
    for(let i=1;i<lateral.length;i++){
        if(Math.sign(lateral[i]) !== Math.sign(lateral[i-1]) && lateral[i]!==0) crossings++;
    }
    const BCF = crossings/2/durationSec;

    return { VCL, VSL, VAP, LIN, STR, WOB, ALH, BCF };
}


function classify(cell, m, p){ // clasiffy each cell as IM, PR, NP or null if not even a cell
  if(cell.trackLength < p.minPathLength) return null;
  if(cell.area < p.minArea || cell.area > p.maxArea) return null;
  if(cell.intensity < p.threshold) return null;
  if(p.backgroundSubtraction && cell.circularity < 0.8) return null;
  if(m.VCL < p.motileVCL) return "IM";
  if(m.VAP >= p.prVAP && m.STR >= p.prSTR) return "PR";
  return "NP";
}

// Real video processing------------------------------

function seekTo(video, t){
    return new Promise((resolve)=>{
        function onSeeked(){ 
            video.removeEventListener("seeked", onSeeked); 
            resolve(); 
        }
        video.addEventListener("seeked", onSeeked);
        video.currentTime = t;
  });
}