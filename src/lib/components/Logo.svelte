<script>
  import {dayjs} from 'dayjs';

  function isNationalLiberation() {
    const now = dayjs();
    const m = now.get('month') + 1;
    const d = now.get('date');
    console.log(now)
    return m === 8 && d === 15;
  }
</script>

<a class:w-20={isNationalLiberation()}
   class:w-14={!isNationalLiberation()}
   class="hidden md:inline-block bg-sky-400 hover:bg-sky-500 dark:bg-transparent dark:hover:bg-gray-500 h-full relative transition-colors text-gray-700 transition-colors" href="/">
  <svg class="absolute h-full top-0 right-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.74 117.45">
    <defs><style>.__main-icon-1{fill:#fff;}.__main-icon-2{fill:#d97a74;}</style></defs>
    <path class="__main-icon-1" d="M61.12,0C55.47.68,43,11.5,43,11.5h7.59c.44,3.2,3,6.2,6.2,6.62S62.69,16,63,15.73a7.09,7.09,0,0,0,1.94-4.23h.59S66.76-.63,61.12,0Z"/><path class="__main-icon-1" d="M26.94,12S11.16,4.79,5.83,6.84,7.4,23.08,7.4,23.08l1-.56c.88,1.95,2,3.44,3.77,4,3.89,1.17,9.7-2.71,10.06-7.58a6.66,6.66,0,0,0-.89-3.77Z"/><path class="__main-icon-1" d="M0,117.38H20.46l15-46.16h9.94v46.23h20l.1-2.94V71.22h21v46.23h20.17V9.82H86.57V56h-21V9.82H32.19q-14.41,0-21.82,7.66T3.06,39.61Q3.06,49.5,6.38,56A23.83,23.83,0,0,0,16.89,66.62ZM23.32,40.45q0-7.94,2.93-11.56c1.75-2.22,4.45-3.34,8.08-3.34H45.45V56h-11a9.61,9.61,0,0,1-8.19-3.76Q23.33,48.38,23.32,40.45Zm12.76-6H55.54v3.18H36.26C30,37.59,29.72,34.41,36.08,34.41Zm0,8.82H55.54v3.19H36.26C30,46.42,29.72,43.23,36.08,43.23Z"/><path class="__main-icon-2" d="M10.37,17.48a22.47,22.47,0,0,1,7.27-5c-2.64-.93-5.87-1.8-7.44-1.19-1.86.71-1,4.13-.12,6.49Z"/><path class="__main-icon-2" d="M60.46,9.82c0-1.92-.45-4.6-2.44-4.37s-5.3,2.62-7.55,4.37Z"/>
  </svg>

  {#if isNationalLiberation()}

    <svg xmlns="http://www.w3.org/2000/svg"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         class="absolute h-full top-0 right-0" viewBox="-36 -24 72 48">
      <title>태극기</title>
      <path d="M-36-24h72v48h-72z" fill="#fff"/>
      <g transform="rotate(-56.3099325)"><!--arctan(-3/2)-->
        <g id="b2"><path id="b" d="M-6-26H6v2H-6zm0 3H6v2H-6zm0 3H6v2H-6z"/>
          <use xlink:href="#b" y="44"/></g>
        <path stroke="#fff" d="M0,17v10"/>
        <path fill="#cd2e3a" d="M0-12A12 12 0 0 1 0 12z"/>
        <path fill="#0047a0" d="M0-12A12 12 0 0 0 0 12 6 6 0 0 0 0 0z"/>
        <circle cy="-6" fill="#cd2e3a" r="6"/></g>
      <g transform="rotate(-123.6900675)"><use xlink:href="#b2"/>
        <path stroke="#fff" d="M0-23.5v3M0,17v3.5M0,23.5v3"/></g></svg>

  {/if}

</a>