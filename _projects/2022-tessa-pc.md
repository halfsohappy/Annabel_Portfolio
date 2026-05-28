---
title: 'Custom All-In-One PC'
subtitle:
highlights:
  - "Retro Vibes!"
  - "Aluminum Extrusions!"
  - "Christmas Spirit!"
  - "Pop OS!"
  - "And I think technically, USB-C."
date: 2022-12-25 00:00:00
description: 
featured_image: '/images/thumbs/tessa_pc.webp'
permalink: /tessa-pc/
layout: wider
grid_width: auto-medium
grid_height: auto
grid_crop: cover
grid_crop_position: center

created_for: my sister
status: Still in her room!
complexity: Medium

personal: true
THE:
EMB:
DSP:
PCBD:
FAB: true
CS:
---

<h3> Project Summary </h3>

This is a custom PC I built for my little sister as a Christmas present! The enclosure is 100% custom by me, made of acrylic and aluminum extrusions. I took inspiration from retro all-in-one computers with chunky off-white ABS enclosures, like the first macintosh. 

<h3> Motivation </h3>

My twin younger sisters were sharing the "family computer" which meant we couldn't all play Minecraft together! So I decided to repurpose a PC that I built into an NES into a custom all-in-one for one of them. Some goals I had for the build were for it to:

* Have a lot of character! Be eye-catching, perhaps adorable, perhaps quirky, and a bit of a statement piece
* Still be totally practical and functional, and require as LITTLE troubleshooting as possible
* Be capable of playing games like Minecraft and handling the other demanding computing needs of a 10 year old
* Be an excellent excuse to learn more about laser cutting and Illustrator, which I was inexperienced with at the time

<h3> Design </h3>

The build consisted of a frame of aluminium extusions with acrylic panels on both the inside and outside, to which the components and fans were mounted, as well as 3D-printed brackets to mount pieces like the monitor.

{% figure %}
<p><img src="/images/tessa_pc/bare_frame.jpeg" alt="Bare Frame"></p>
{% endfigure %}
	The bare frame. It's missing the bottom piece of
	the front frame and the side fan mount.

{% figure %}
<p><img src="/images/tessa_pc/screen.jpeg" alt="Screen"></p>
{% endfigure %}
	The monitor, mounted with 3D printed brackets.

<h4> Wiring </h4>

In terms of wiring, there is a hidden SATA drive behind the motherboard with a Linux (Pop! OS) ISO, as a little easter egg from when this computer was meant to be "Annie's Linux Computer" and not "Her sister's Minecraft PC". The drive is connected to a key switch which physically disconnects power to the drive (which is the preferred boot drive) so I can switch it into Linux mode and boot it up for me, then remove my key and it goes back to being her PC -- and she can't even view the drive! This does, however, result in the most cursed cable in existence: a combination of molex (to get 5V from the PSU), micro-usb (providing continuous power to the monitor), ring terminals (for the key switch), and SATA (for the linux SSD).

{% figure %}
<p><img src="/images/tessa_pc/cable.jpg" alt="Cable"></p>
{% endfigure %}
	I am so, so sorry.

Also for wiring, I made a custom front I/O panel with USB 3, intake fans (more on that later), a big and fun arcade button for power, and aftermentioned key switch.


{% figure %}
<p><img src="/images/tessa_pc/front.jpeg" alt="I/O"></p>
{% endfigure %}

<h4> Airflow </h4>

A lot of thought was put into airflow in the case. The main intakes are an 80mm fan in the back and the power supply fan, also on the back of the case. On the right side of the case, the motherboard is mounted, and the CPU cooler is positioned by the main intake. On the side opposite of the motherboard is a massive 140mm fan as the exhaust. The system works very well! The front panel also contains dual 40mm fans that kick in if the graphics card temps get too high, and intake cool air directly onto the card's heatsink.

{% figure %}
<p><img src="/images/tessa_pc/intake.jpeg" alt="Intake"></p>
{% endfigure %}
	A test fit of the motherboard and intake.

{% figure %}
<p><img src="/images/tessa_pc/side_fan.jpeg" alt="Side Fan"></p>
{% endfigure %}
	A test fit of the side panel with 140mm fan.

<h3> Aesthetics </h3>

Since I wanted to evoke retro all-in-ones, and their gorgeous off-white plastic enclosures, I went with an off-white acrylic that leaned extremely pink (so as to be sister approved). I wanted the classic blocky look, and settled with a design that is a little taller than being a cube, and has a recess for I/O (or an extrusion for the monitor, however you see it). I think it is perfectly striking, yet familiar! 

{% figure %}
<p><img src="/images/tessa_pc/pc_on_her_desk.jpg" alt="Desk"></p>
{% endfigure %}
	What a perfect "little sister" PC!

 The monitor was a little smaller than would have been ideal, but it was surprisingly high quality and so I wanted to use it nontheless. To compensate for the large bezels, I hired an artist friend of mine to make a design for the bezels and then lazer engraved it onto the front. To make the design a little more exciting, I added a translucent purple top so you can view the internals.


 {% figure %}
<p><img src="/images/tessa_pc/bezel.jpeg" alt="Bezel"></p>
{% endfigure %}
	The Bezel Design

 {% figure %}
<p><img src="/images/tessa_pc/mon.jpeg" alt="Desk"></p>
{% endfigure %}
	The finished head-on view.


At the last second, I made a headphone stand that matched the design, for a complete set of peripherals including a mechanical keyboard I already had, a logitech mouse, and a headset off ebay.

 {% figure %}
<p><img src="/images/tessa_pc/peri.jpeg" alt="Desk"></p>
{% endfigure %}
	Watch out, r/battlestations.

And that's the build! Extremely proud of this one, and recieved a TON of big sister cred for it.
