<form on:submit|preventDefault>
  <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-gray-300">검색</label>
  <div class="relative">
    <div class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
      <svg aria-hidden="true" class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </div>
    <input type="search"
           id="default-search"
           class="block p-4 pl-10 w-full text-sm text-gray-900 bg-gray-50 rounded-md border border-gray-300 focus:ring-sky-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
           placeholder="#으로 태그 검색. title:로 제목 한정 검색" required>
    <button type="submit" class="text-white absolute right-2.5 bottom-2.5 bg-sky-500 hover:bg-sky-600 font-medium rounded-md text-sm px-4 py-2 dark:bg-sky-700 dark:hover:bg-sky-800 dark:focus:ring-blue-800 transition-colors">검색</button>
  </div>
</form>