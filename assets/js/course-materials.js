(() => {
  function downloadFile(link) {
    const downloader = document.createElement("a");
    downloader.href = link.href;
    downloader.download = link.getAttribute("download") || "";
    downloader.target = link.target || "_blank";
    downloader.rel = "noopener";
    document.body.appendChild(downloader);
    downloader.click();
    downloader.remove();
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-access]");
    if (!link || link.dataset.access !== "password") {
      return;
    }

    event.preventDefault();
    const expectedPassword = link.dataset.coursePassword || "";
    const enteredPassword = window.prompt("Enter the course password to download this material:");

    if (enteredPassword === null) {
      return;
    }

    if (enteredPassword === expectedPassword) {
      downloadFile(link);
      return;
    }

    window.alert("Incorrect password.");
  });
})();
