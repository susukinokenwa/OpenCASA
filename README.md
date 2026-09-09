# CASA Web
This is an opensourced web based Computer Assisted Semen Analysis program. Providing a quick and simple way to analyze semen motality. 

## Features
- Each cell will be classified into one of the three categories: 
    1. PR (Progressive)
    2. NP (non-progressive)
    3. IM (Immotile)  

- The following data will be provided for each cell identified: 
    1. VCL(um/s) — Curvilinear Velocity
    2. VSL(um/s) — Straight-Line Velocity
    3. VAP(um/s) — Average Path Velocity
    4. LIN — Linearity (VSL / VCL)
    5. STR — Straightness (VSL / VAP)
    6. WOB — Wobble (VAP / VCL)
    7. ALH(um) — Amplitude of Lateral Head Displacement
    8. BCF(Hz) — Beat-Cross Frequency  

- The above Data Will also be calculated as Average
- Displays the Overall Distribution of VAP, VCL and VSL
- Exports a .csv with the Calculated Data
    

## Instructions

1. Click on Upload video Button
2. Upload your video
3. Enter the Threshold values
4. Click 'Reanalyze'
5. Enjoy your Results!  
p.s. click on the demo video button to se a sample video

## Known Limitations

- FPS needs to be entered by user, If value entered is higher than the actual fps of the uploaded video, the data captured will produce duplicated frames causing inaccuracy in Data.
- Cells on the edge of video might produce slightly inaccurate results due to tracked area of cell might be smaller than the actual size.

###### Made by Skyler Sun:: my attempt to learn more js :)

## Dictionary
VCL(um/s) — Curvilinear Velocity

>The speed measured by tracing every twist and turn of the actual, literal path the cell took. Computed by summing the distance between every consecutive pair of tracked positions (Math.hypot between each frame's point and the previous one), then converting to µm/s via your Calibration and Frame Rate settings. This is the highest of the three velocity numbers, since it includes every bit of the flagellar wiggle as "distance traveled," not just net progress.

VSL(um/s) — Straight-Line Velocity

>The speed measured by the most direct possible path: a straight line from where the cell started to where it ended up, ignoring everything that happened in between. This is the lowest of the three, since a straight line between two points is never longer than any wiggly path connecting them.

VAP(um/s) — Average Path Velocity

>The speed measured along a smoothed version of the path, with the fast wiggle averaged out but the overall drift direction preserved (this is the whole win/moving-average discussion from a few messages back). Sits between VCL and VSL — always VSL ≤ VAP ≤ VCL for a genuine track.

LIN — Linearity (VSL / VCL)

>How close the literal path was to a straight line. Ranges 0–1: near 1 means the cell barely wiggled and moved almost dead straight; near 0 means most of its "distance traveled" was wasted on wiggling in place rather than making net progress.

STR — Straightness (VSL / VAP)

>Same idea as LIN, but compares against the smoothed path instead of the raw one. This is specifically what your PR STR threshold (default 0.80) checks — "of the smoothed forward progress this cell made, what fraction was actually a straight line?" This is what separates true progressive swimmers from cells that drift in slow curves or loops.

WOB — Wobble (VAP / VCL)

>How much of the raw path's total distance survived the smoothing process. Close to 1 means the raw path was already fairly smooth (little wiggle to average away); close to 0 means the cell wiggled a lot, so most of its raw VCL "distance" got smoothed away and didn't contribute to VAP.

ALH(um) — Amplitude of Lateral Head Displacement

>How far, on average, the actual head strays sideways from its own smoothed centerline, in µm. Measures the size of the wiggle itself — a big wobbly swimmer has high ALH; a cell moving in a nearly straight line has low ALH, regardless of how fast it's going.

BCF(Hz) — Beat-Cross Frequency

>How many times per second the wiggling path crosses back and forth over its own smoothed centerline. Measures the speed of the wiggle (like counting how fast a tail is flicking side to side), independent of how big each wiggle is (that's ALH's job) or how fast the cell is actually traveling forward (that's VCL/VAP/VSL's job).

###### Disclaimer: This tool performs pixel-brightness threshold segmentation and tracks cell centroids frame-by-frame using a nearest-neighbor algorithm inside the browser. As a lightweight demonstration, it is not a medical-grade CASA algorithm and the results are for reference only.