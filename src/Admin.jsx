import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Admin() {
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState(0);
  const [ventaHoy, setVentaHoy] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const hoy = new Date().toISOString().split("T")[0];

    const { count } = await supabase
      .from("clientes")
      .select("*", {
        count: "exact",
        head: true,
      });

    setClientes(count || 0);

    const { data, error } = await supabase
      .from("citas")
      .select(`
        *,
        clientes (
          nombre,
          telefono
        ),
        servicios (
          nombre,
          precio
        )
      `)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) {
      alert("Error cargando agenda: " + error.message);
      return;
    }

    setCitas(data || []);

    const citasHoy =
      data?.filter(
        (c) =>
          c.fecha === hoy &&
          c.estado === "confirmada"
      ) || [];

    const total = citasHoy.reduce(
      (sum, cita) =>
        sum + Number(cita.servicios?.precio || 0),
      0
    );

    setVentaHoy(total);
  }

  async function cancelar(id) {
    const confirmar = confirm("¿Cancelar esta cita?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("citas")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error cancelando cita: " + error.message);
      return;
    }

    await cargarDatos();
  }

  function formatearFecha(fecha) {
    if (!fecha) return "";

    const [year, month, day] = fecha.split("-");

    return `${day}/${month}/${year}`;
  }

  function formatearHora(hora) {
    if (!hora) return "";

    return hora.substring(0, 5);
  }

  return (
    <div className="container">
      <h1>💈 Panel Barbería</h1>

      <div className="card">
        <h3>👥 Clientes: {clientes}</h3>
        <h3>💰 Venta hoy: ${ventaHoy}</h3>
        <h3>📅 Citas: {citas.length}</h3>
      </div>

      <div
        className="card"
        style={{ marginTop: 20 }}
      >
        <h2>Agenda</h2>

        <table
          style={{
            width: "100%",
            background: "white",
            color: "black",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Servicio</th>
              <th>Comentarios</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {citas.map((cita) => (
              <tr key={cita.id}>
                <td>{formatearFecha(cita.fecha)}</td>
                <td>{formatearHora(cita.hora_inicio)}</td>
                <td>{cita.clientes?.nombre || "-"}</td>
                <td>{cita.clientes?.telefono || "-"}</td>
                <td>{cita.servicios?.nombre || "-"}</td>
                <td>{cita.comentarios || "-"}</td>
                <td>{cita.estado}</td>
                <td>
                  <button
                    onClick={() => cancelar(cita.id)}
                  >
                    🗑 Cancelar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {citas.length === 0 && (
          <p>No hay citas registradas.</p>
        )}
      </div>
    </div>
  );
}
