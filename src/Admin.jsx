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

    const { data } = await supabase
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
      .order("fecha");

    setCitas(data || []);

    const citasHoy =
      data?.filter(
        (c) =>
          c.fecha === hoy &&
          c.estado === "confirmada"
      ) || [];

    const total = citasHoy.reduce(
      (sum, cita) =>
        sum + (cita.servicios?.precio || 0),
      0
    );

    setVentaHoy(total);
  }

  async function cancelar(id) {
    const confirmar = confirm(
      "¿Cancelar cita?"
    );

    if (!confirmar) return;

    await supabase
      .from("citas")
      .delete()
      .eq("id", id);

    cargarDatos();
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
          }}
        >
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {citas.map((cita) => (
              <tr key={cita.id}>
                <td>{cita.fecha}</td>

                <td>
                  {cita.hora_inicio}
                </td>

                <td>
                  {
                    cita.clientes?.nombre
                  }
                </td>

                <td>
                  {
                    cita.servicios?.nombre
                  }
                </td>

                <td>
                  <button
                    onClick={() =>
                      cancelar(cita.id)
                    }
                  >
                    🗑 Cancelar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
