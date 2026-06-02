import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error cargando servicios");
      return;
    }

    setServicios(data);
  }

  return (
    <div className="container">
      <h1>💈 Barbería Chat</h1>

      <div className="card">
        <h2>Agendar cita</h2>

        <label>Servicio</label>
        <select>
          <option value="">Selecciona un servicio</option>
          {servicios.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre} - ${servicio.precio}
            </option>
          ))}
        </select>

        <input placeholder="Nombre" />
        <input placeholder="Teléfono" />

        <button>Reservar</button>
      </div>
    </div>
  );
}
