---
title: 'FPGA-based Synthesizer'
subtitle: 'A class final: A polyphonic synthesizer that interfaces with MIDI instruments, all running on a custom soft-core FPGA.'
highlights:
  - "i2s!"
  - "MIDI!"
  - "WS2812 signaling protocol!"
  - "Verilog!"
date: 2024-3-1 00:00:00
description:
featured_image: '/images/thumbs/fpga.webp'
permalink: /fpga_synth/
layout: wider
grid_width: auto-medium
grid_height: auto-medium
grid_crop: cover
grid_crop_position: center


created_for: final for ECE 350: Hardware Design
status: Earned an A+!
complexity: High


personal: true
THE:
EMB: true
DSP: true
PCBD:
FAB:
CS: true
---

<h3> Overview </h3>
This was a final project for ECE 350 - Digital Systems. After designing our own processors, we worked with a partner to “do something cool with them”. My partner Eric and I decided on a synthesizer, as we're both musicians and and were finalists in a song making competition from our Signals and Systems class. Our original idea was to also create mechatronic puppets that would “sing” along to the synthesizer as it was played: this would also allow us to flex our DSP muscles and implement some sort of spectrum analyzer. However, the short 3-week period we were given to implement all of our ideas resulted in us dramatically tightening our scope.

In the end, we were still able to implement most of our goals. These included:

* Memory-mapped I/O
* MIDI input interface
* I2S audio output
* Waveform generation: Sawtooth, Square, Triangle, and Sine Waves
* Pitch Bend
* Polyphonic Synthesis
* Spectrum Analyzer: FFT-inspired Discrete Cosine Transform
* WS2812b LED interface (not successfully integrated)

<h3> Hardware </h3>
I really jumped at the oppurtunity to play with a lot of hardware for this project, as I am apt to do, and the final circuit looked something like this:

![](/images/fpga/SCHEM.png)

<h3> Demo </h3>
To see (and hear) it in action, you can watch our demo video below:

{% figure %}
<p>
<iframe src="https://drive.google.com/file/d/1bHtXSqo0AJeKrj7kuaZBhUttnHXL6bu_/preview" width="640" height="360" allow="autoplay"></iframe>
</p>
{% endfigure %}
