// Estado global
let usuarioActual = null;
let carrito = [];

// Cargar usuario si está en sessionStorage
window.onload = () => {
  const usuario = sessionStorage.getItem("usuario");
  if (usuario) {
    usuarioActual = usuario;
    document.getElementById("login-icon").textContent = `👤 ${usuarioActual}`;
  }
};

// Buscar productos con autocompletado
const inputBusqueda = document.getElementById("busqueda");
const sugerencias = document.getElementById("sugerencias");

inputBusqueda?.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  sugerencias.innerHTML = "";

  if (query.length >= 3) {
    const res = await fetch(`/api/busqueda?q=${query}`);
    const productos = await res.json();

    productos.forEach(producto => {
      const item = document.createElement("li");
      item.textContent = producto.nombre;
      item.onclick = () => {
        window.location.href = `${producto.nombre}.html`;
      };
      sugerencias.appendChild(item);
    });
  }
});

// Función para añadir producto al carrito
function agregarAlCarrito(nombreProducto) {
  if (!usuarioActual) {
    alert("Debes iniciar sesión para añadir productos al carrito.");
    window.location.href = "login.html";
    return;
  }
  carrito.push(nombreProducto);
  sessionStorage.setItem("carrito", JSON.stringify(carrito));
  alert("Producto añadido al carrito.");
}
