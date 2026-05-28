---
title: 'Reactive LEDs for Wind Synthesizer'
subtitle: 'A quick project putting a rudimentary spectrum analyzer on the side of an instrument.'
date: 2022-3-1 00:00:00
description: Board is a stylish full-width masonry grid theme. Made for designers, artists, photographers and developers to show off their best work.
featured_image: '/images/thumbs/ewi_led.webp'
permalink: /EWI-LED/
grid_width: auto-small
grid_height: 2
grid_crop: cover
grid_crop_position: center

created_for: myself
status: since dismantled
complexity: Low

personal: true
THE:
EMB: true
DSP: true
PCBD:
FAB:
CS:
---

This was a pretty quick project! I covered my wind controller in WS2812 RGB LEDs and wired them all to a microcontroller and a little DC/DC power supply. I fed it 20V over USB-C, and it stepped it down to 5V and the very high current needed. The lineout of the wind controller went to a [Pixelblaze Sensor Expansion Board](https://shop.electromage.com/products/pixelblaze-sensor-expansion-board?srsltid=AfmBOorHh2tweQ16XxGlIHuoSNQGD2IDDGLe0hQOGYSj1ciZGr6mCeKW) which did the FFT, and an ESP32 turned that data into a light-show on the very instrument being played! Red->Yellow denotes pitch, while brightness indicates amplitude. It's a not perfect system, harmonic analysis vs frequency analysis are not identical, but it's still a pretty sight! You can see the system in action in the video below.

<iframe width="560" height="315" src="https://www.youtube.com/embed/KHjNlPl6cxA?si=Py97aO0l7uGJmzdk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>