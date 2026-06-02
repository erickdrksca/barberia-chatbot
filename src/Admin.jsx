import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Admin() {
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState(0);
  const [ventaHoy, setVentaHoy] = useState(0);
  const [ventaTotal, setVentaTotal] = useState(0);
  const [citasPendientes, setCitasPendientes] = useState(0);
  const [citasHoy, setCitasHoy] = useState(0);

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

    const lista = data || [];

    setCitas(lista);

    const pendientes = lista.filter(
      (c) => c.estado === "confirmada"
    );

    const hoyConfirmadas = lista.filter(
      (c) =>
        c.fecha === hoy &&
        c.estado === "confirmada"
    );

    const hoyCompletadas = lista.filter(
      (c) =>
        c.fecha === hoy &&
        c.estado === "completada"
    );

    const completadas = lista.filter(
      (c) => c.estado === "completada"
    );

    setCitasPendientes(pendientes.length);
    setCitasHoy(hoyConfirmadas.length + hoyCompletadas.length);

    setVentaHoy(
      hoyCompletadas.reduce(
        (sum, cita) =>
          sum + Number(cita.servicios?.precio || 0),
        0
      )
    );

    setVentaTotal(
      completadas.reduce(
        (sum, cita) =>
          sum + Number(cita.servicios?.precio || 0),
        0
      )
    );
  }

  async function completar(id) {
    const confirmar = confirm("¿Marcar esta cita como completada?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("citas")
      .update({
        estado: "completada",
      })
      .eq("id", id);

    if (error) {
      alert("Error completando cita: " + error.message);
      return;
    }

    await cargarDatos();
  }

  async function cancelar(id) {
    const confirmar = confirm("¿Cancelar esta cita?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("citas")
      .update({
        estado: "cancelada",
      })
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

  function colorEstado(estado) {
    if (estado === "completada") return "green";
    if (estado === "cancelada") return "red";
    return "orange";
  }

  function textoEstado(estado) {
    if (estado === "completada") return "Completada";
    if (estado === "cancelada") return "Cancelada";
    return "Confirmada";
  }

  const estilosCelda = {
    padding: "12px",
    borderBottom: "1px solid #ddd",
    verticalAlign: "top",
  };

  const estilosHeader = {
    padding: "12px",
    borderBottom: "2px solid #111827",
    textAlign: "left",
    background: "#f3f4f6",
  };

  return (
    <div className="container">
      <h1>💈 Panel Barbería</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <div className="card">
          <h3>👥 Clientes</h3>
          <h2>{clientes}</h2>
        </div>

        <div className="card">
          <h3>📅 Citas hoy</h3>
          <h2>{citasHoy}</h2>
        </div>

        <div className="card">
          <h3>⏳ Pendientes</h3>
          <h2>{citasPendientes}</h2>
        </div>

        <div className="card">
          <h3>💰 Venta hoy</h3>
          <h2>${ventaHoy}</h2>
        </div>

        <div className="card">
          <h3>💵 Venta total</h3>
          <h2>${ventaTotal}</h2>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Agenda</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "900px",
              background: "white",
              color: "black",
              borderCollapse: "collapse",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr>
                <th style={estilosHeader}>Fecha</th>
                <th style={estilosHeader}>Hora</th>
                <th style={estilosHeader}>Cliente</th>
                <th style={estilosHeader}>Teléfono</th>
                <th style={estilosHeader}>Servicio</th>
                <th style={estilosHeader}>Comentarios</th>
                <th style={estilosHeader}>Estado</th>
                <th style={estilosHeader}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {citas.map((cita) => (
                <tr key={cita.id}>
                  <td style={estilosCelda}>
                    {formatearFecha(cita.fecha)}
                  </td>

                  <td style={estilosCelda}>
                    {formatearHora(cita.hora_inicio)}
                  </td>

                  <td
                    style={{
                      ...estilosCelda,
                      whiteSpace: "nowrap",
                      fontWeight: "bold",
                    }}
                  >
                    {cita.clientes?.nombre || "-"}
                  </td>

                  <td
                    style={{
                      ...estilosCelda,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cita.clientes?.telefono || "-"}
                  </td>

                  <td style={estilosCelda}>
                    {cita.servicios?.nombre || "-"}
                  </td>

                  <td style={estilosCelda}>
                    {cita.comentarios || "-"}
                  </td>

                  <td
                    style={{
                      ...estilosCelda,
                      fontWeight: "bold",
                      color: colorEstado(cita.estado),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {textoEstado(cita.estado)}
                  </td>

                  <td style={estilosCelda}>
                    {cita.estado === "confirmada" ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button onClick={() => completar(cita.id)}>
                          ✅ Completar
                        </button>

                        <button onClick={() => cancelar(cita.id)}>
                          🗑 Cancelar
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#6b7280" }}>
                        Sin acciones
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {citas.length === 0 && <p>No hay citas registradas.</p>}
      </div>
    </div>
  );
}
