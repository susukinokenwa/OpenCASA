"use strict";

// Constants----------------------------
const CANVAS_W = 660, CANVAS_H = 400;
const FIELD_L = 90, FIELD_R = CANVAS_W - 90;
const DEMO_FRAMES = 80;
const RAW_CELL_COUNT = 46;
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


