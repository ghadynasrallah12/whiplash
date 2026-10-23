// =========================================================
// WHIPLASH — projects
// Edit this file to add / change projects. Order = list order.
//   tag     : filter in the burger menu (ALL is automatic)
//   thumb   : image shown in the list (16:9)
//   video   : optional mp4 — plays in the list + as the detail background
//   hero    : true on the project whose film is the homepage background — when Projects opens,
//             that film shrinks into the list and keeps playing from the same second
//   logo    : optional client / film logo (png with transparency), detail view
//   award   : optional laurel image, detail view
//   link    : optional "watch full film" URL
//   credits : [role, name] pairs
// =========================================================
window.WHIPLASH_FILTERS = ['Runway', 'Cuts on Beat', "Director's Cut", 'Full Throttle', 'Postcards', 'Prime Time'];

window.WHIPLASH_PROJECTS = [
  { hero: true,
    name: 'Whiplash', type: 'Showreel', tag: "Director's Cut",
    thumb: 'assets/hero-poster.jpg', video: 'assets/hero.mp4', logo: '', award: '',
    description: 'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Music Composer', 'Ndi Iwdij'], ['VFX', 'Owaidjp Noiwdai'], ['Online', 'Ndi Isjdow'], ['Production', 'Whdi Dwiiw'], ['Agency', 'Jowja Iawdjol'], ['Client', 'Iwajd Iwjdo'], ['Creative Director', 'Idjwoa Oijaow']],
  },
  {
    name: 'Night Shift', type: 'Music Video', tag: "Cuts on Beat",
    thumb: 'assets/work-1.jpg', video: '', logo: '', award: '',
    description: 'From offline to online edit, VFX, grading, and full creative direction, we shape every stage of the process; designing rhythm, flow, visual language, and sound.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Velvet Static', type: 'Fashion Film', tag: "Runway",
    thumb: 'assets/work-2.jpg', video: '', logo: '', award: '',
    description: 'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Hollow Ground', type: 'Documentary', tag: "Director's Cut",
    thumb: 'assets/work-3.jpg', video: '', logo: '', award: '',
    description: 'We come from music, not film. That\'s why we care so much about timing. If it doesn\'t feel right, we don\'t move on.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Paper Moon', type: 'Ad', tag: "Prime Time",
    thumb: 'assets/work-4.jpg', video: '', logo: '', award: '',
    description: 'From offline to online edit, VFX, grading, and full creative direction, we shape every stage of the process; designing rhythm, flow, visual language, and sound.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Saint Nobody', type: 'Profile Film', tag: "Postcards",
    thumb: 'assets/work-5.jpg', video: '', logo: '', award: '',
    description: 'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Glass Hours', type: 'Short Film', tag: "Director's Cut",
    thumb: 'assets/work-6.jpg', video: '', logo: '', award: '',
    description: 'We come from music, not film. That\'s why we care so much about timing. If it doesn\'t feel right, we don\'t move on.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Low Tide', type: 'Fashion Film', tag: "Runway",
    thumb: 'assets/work-7.jpg', video: '', logo: '', award: '',
    description: 'From offline to online edit, VFX, grading, and full creative direction, we shape every stage of the process; designing rhythm, flow, visual language, and sound.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Mercury Lane', type: 'Ad', tag: "Full Throttle",
    thumb: 'assets/work-8.jpg', video: '', logo: '', award: '',
    description: 'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Afterglow', type: 'Music Video', tag: "Cuts on Beat",
    thumb: 'assets/work-9.jpg', video: '', logo: '', award: '',
    description: 'We come from music, not film. That\'s why we care so much about timing. If it doesn\'t feel right, we don\'t move on.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Tin Halo', type: 'Profile Film', tag: "Postcards",
    thumb: 'assets/work-10.jpg', video: '', logo: '', award: '',
    description: 'From offline to online edit, VFX, grading, and full creative direction, we shape every stage of the process; designing rhythm, flow, visual language, and sound.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Concrete Hymn', type: 'Fashion Film', tag: "Runway",
    thumb: 'assets/work-11.jpg', video: '', logo: '', award: '',
    description: 'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Wild Signal', type: 'Ad', tag: "Full Throttle",
    thumb: 'assets/work-12.jpg', video: '', logo: '', award: '',
    description: 'We come from music, not film. That\'s why we care so much about timing. If it doesn\'t feel right, we don\'t move on.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
  {
    name: 'Second Skin', type: 'Short Film', tag: "Prime Time",
    thumb: 'assets/work-13.jpg', video: '', logo: '', award: '',
    description: 'From offline to online edit, VFX, grading, and full creative direction, we shape every stage of the process; designing rhythm, flow, visual language, and sound.',
    link: 'https://vimeo.com/',
    credits: [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']],
  },
];
