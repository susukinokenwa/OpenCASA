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
