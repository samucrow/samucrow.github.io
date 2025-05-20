
function timeAgo(publishedDate) {
    const now = new Date();
    const published = new Date(publishedDate);
    const difference = now - published;
    const differenceInHours = Math.floor(difference / (1000 * 60 * 60));
    const differenceInDays = Math.floor(difference / (1000 * 60 * 60 * 24));
    
    if (differenceInDays > 0) {
        return `${differenceInDays} day${differenceInDays === 1 ? '' : 's'} ago`;
    }
    return `${differenceInHours} hour${differenceInHours === 1 ? '' : 's'} ago`;
}


function displayWriteup() {
    fetch('/writeups/writeups.json')
        .then(response => response.json())
        .then(data => {
            // Get first writeup "[0]"
            const writeup = data[0];
            const lastWriteupDiv = document.getElementById('last-writeup');

            lastWriteupDiv.innerHTML = `
                <div class="last-machine-first-info">
                    <span class="published text">Published ${timeAgo(writeup.published)}</span>
                    <div class="difficulty-os">
                        <span class="difficulty ${writeup.difficulty.toLowerCase()}">${writeup.difficulty}</span>
                        <span class="os ${writeup.os.toLowerCase()}">${writeup.os}</span>
                    </div>
                </div>
                <h2 class="machine-name">${writeup.name} - <span class="platform ${writeup.platform.toLowerCase()}">${writeup.platform}</span> Machine</h2>
                <p class="machine-description text">${writeup.description}</p>
                <div class="tags-div">
                    ${writeup.tags.map(tag => `<span class="tag">#${tag.charAt(0).toUpperCase() + tag.slice(1)}</span>`).join('\n')}
                </div>
                <div class="last-machine-bottom">
                    <div class="user-div">
                        <img class="samucrow-logo" src="/images/samucrow_logo.avif" alt="SamuCrow">
                        <div class="user-description">
                            <h3 class="username">SamuCrow</h3>
                            <span class="user-definition text">Pentester</span>
                        </div>
                    </div>
                    <a href="https://samucrow.github.io/writeups/${writeup.name.toLowerCase()}" class="machine-link">Read Writeup <i class="material-icons" id="writeup-arrow">arrow_forward</i></a>
                </div>
            `;

            // Machines Statistics
            let totalMachines = 0;
            let windowsMachines = 0;
            let linuxMachines = 0;

            data.forEach(writeup => {
                totalMachines++;

                if (writeup.os.toLowerCase() === 'windows') {
                    windowsMachines++;
                } else if (writeup.os.toLowerCase() === 'linux') {
                    linuxMachines++;
                }
            });

            document.getElementById('machine-writeups').textContent = totalMachines;
            document.getElementById('windows-machines').textContent = windowsMachines;
            document.getElementById('linux-machines').textContent = linuxMachines;

            enableMobileHover();
        })
        .catch(error => console.error('Error loading writeups:', error));
}


function plausibleVisitors() {
    //Cloudfare API Key
    fetch('https://plausible-api.samucrow.workers.dev/')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const visitorsLastMonth = data.visitors;
            document.getElementById('monthly-visitors').textContent = visitorsLastMonth;
        })
        .catch(error => {
            console.error('Error fetching visitors data:', error);
        });
}

let debounceTimeout;

function enableMobileHover() {
    if (window.matchMedia('(pointer: fine)').matches) return;

    const target = document.querySelector('.last-machine-container');
    if (!target) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            clearTimeout(debounceTimeout); // Limpiar cualquier timeout previo

            debounceTimeout = setTimeout(() => {
                const fullyVisible = entry.intersectionRatio >= 0.8;

                const tags = target.querySelectorAll('.tag');

                if (fullyVisible) {
                    target.classList.add('mobile-hover');
                    tags.forEach(tag => tag.classList.add('mobile-hover-tag'));
                } else {
                    target.classList.remove('mobile-hover');
                    tags.forEach(tag => tag.classList.remove('mobile-hover-tag'));
                }
            }, 350); // Ejecutar después de 0.5 segundos de inactividad
        },
        {
            root: null,
            threshold: [0.8]
        }
    );

    observer.observe(target);
}


document.addEventListener('DOMContentLoaded', () => {
    displayWriteup();
    plausibleVisitors();

    const menuToggle = document.getElementById('toggle-button');
    const navMenu = document.querySelector('.nav-menu');
    const navRightLinks = document.querySelector('.nav-right-links');

    // Lottie animation setup
    const lottieIcon = lottie.loadAnimation({
        container: document.getElementById('lottie-icon'),
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/assets/lottieflow-menu-nav-08-fafafa-easey.json'
    });

    let isMenuOpen = false;

    menuToggle.addEventListener('click', () => {
        if (isMenuOpen) {
            // Añadir clase de cierre (sin quitar active aún)
            navMenu.classList.add('closing');

            // Después de animar, limpiar clases
            setTimeout(() => {
                navMenu.classList.remove('active', 'closing');
            }, 600); // Duración igual a la animación CSS
            navRightLinks.classList.remove('active');
        } else {
            // Apertura directa
            navMenu.classList.add('active');
            navRightLinks.classList.add('active');
        }

        // Lottie Animation
        if (isMenuOpen) {
            lottieIcon.playSegments([63, 97], true);
        } else {
            lottieIcon.playSegments([0, 63], true);
        }

        isMenuOpen = !isMenuOpen;
    });
});
