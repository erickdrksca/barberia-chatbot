import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Admin() {
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState(0);
  const [ventaHoy, setVentaHoy] = useState(0);
  const [ventaTotal, setVentaTotal] = useState(0);
  const [citasPendientes, setCitasPendientes] = useState(0);
  const [citasHoy, setCitasHoy] = useState(0);
  const [password, setPassword] = useState("");
const [autorizado, setAutorizado] = useState(
  localStorage.getItem("adminAuth") === "true"
);

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

    const pendientes = lista.filter((c) => c.estado === "confirmada");

    const hoyConfirmadas = lista.filter(
      (c) => c.fecha === hoy && c.estado === "confirmada"
    );

    const hoyCompletadas = lista.filter(
      (c) => c.fecha === hoy && c.estado === "completada"
    );

    const completadas = lista.filter((c) => c.estado === "completada");

    setCitasPendientes(pendientes.length);
    setCitasHoy(hoyConfirmadas.length + hoyCompletadas.length);

    setVentaHoy(
      hoyCompletadas.reduce(
        (sum, cita) => sum + Number(cita.servicios?.precio || 0),
        0
      )
    );

    setVentaTotal(
      completadas.reduce(
        (sum, cita) => sum + Number(cita.servicios?.precio || 0),
        0
      )
    );
  }

  async function actualizarEstado(id, nuevoEstado) {
    const confirmar = confirm(`¿Cambiar esta cita a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("citas")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", id);

    if (error) {
      alert("Error actualizando cita: " + error.message);
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
    if (estado === "completada") return "#22c55e";
    if (estado === "cancelada") return "#ef4444";
    return "#f59e0b";
  }

  function textoEstado(estado) {
    if (estado === "completada") return "Completada";
    if (estado === "cancelada") return "Cancelada";
    return "Confirmada";
  }

  const metricas = [
    {
      titulo: "Clientes",
      valor: clientes,
      icono: "👥",
    },
    {
      titulo: "Citas hoy",
      valor: citasHoy,
      icono: "📅",
    },
    {
      titulo: "Pendientes",
      valor: citasPendientes,
      icono: "⏳",
    },
    {
      titulo: "Venta hoy",
      valor: `$${ventaHoy}`,
      icono: "💰",
    },
    {
      titulo: "Venta total",
      valor: `$${ventaTotal}`,
      icono: "💵",
    },
  ];

  const th = {
    padding: "14px",
    textAlign: "left",
    color: "#111827",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const td = {
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    verticalAlign: "top",
    fontSize: "14px",
  };

  if (!autorizado) {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: "400px", margin: "80px auto" }}>
        <h1>🔒 Panel Admin</h1>
        <p>Ingresa la contraseña</p>

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={() => {
            if (password === "alexis2026") {
              localStorage.setItem("adminAuth", "true");
              setAutorizado(true);
            } else {
              alert("Contraseña incorrecta");
            }
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "34px 16px",
        background:
          "radial-gradient(circle at top, rgba(212,175,55,0.18), transparent 34%), linear-gradient(135deg, #020617, #111827)",
      }}
    >
      <main style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <p
              style={{
                color: "#d4af37",
                margin: 0,
                fontWeight: "900",
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontSize: "13px",
              }}
            >
              Administración
            </p>

            <h1
              style={{
                color: "white",
                margin: "8px 0 0",
                fontSize: "44px",
                lineHeight: "1",
              }}
            >
              Panel Barbería Alexis
            </h1>
          </div>

          <img
            src="/logo.png"
            alt="Barbería Alexis"
            style={{
              width: "86px",
              height: "86px",
              objectFit: "cover",
              borderRadius: "50%",
              border: "2px solid #d4af37",
            }}
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          {metricas.map((m) => (
            <div
              key={m.titulo}
              style={{
                background: "rgba(15, 23, 42, 0.94)",
                border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
              }}
            >
              <div style={{ fontSize: "25px", marginBottom: "10px" }}>
                {m.icono}
              </div>

              <p
                style={{
                  color: "#94a3b8",
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {m.titulo}
              </p>

              <h2
                style={{
                  color: "white",
                  margin: "8px 0 0",
                  fontSize: "30px",
                }}
              >
                {m.valor}
              </h2>
            </div>
          ))}
        </section>

        <section
          style={{
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid rgba(212,175,55,0.22)",
            borderRadius: "22px",
            padding: "22px",
            boxShadow: "0 22px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ color: "white", margin: 0 }}>Agenda</h2>

            <button
              onClick={cargarDatos}
              style={{
                border: "1px solid rgba(212,175,55,0.4)",
                background: "rgba(212,175,55,0.12)",
                color: "#d4af37",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: "900",
                cursor: "pointer",
              }}
            >
              Actualizar
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: "980px",
                borderCollapse: "collapse",
                background: "white",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Hora</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Servicio</th>
                  <th style={th}>Comentarios</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {citas.map((cita) => (
                  <tr key={cita.id}>
                    <td style={td}>{formatearFecha(cita.fecha)}</td>
                    <td style={td}>{formatearHora(cita.hora_inicio)}</td>
                    <td style={{ ...td, fontWeight: "900", whiteSpace: "nowrap" }}>
                      {cita.clientes?.nombre || "-"}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {cita.clientes?.telefono || "-"}
                    </td>
                    <td style={td}>{cita.servicios?.nombre || "-"}</td>
                    <td style={td}>{cita.comentarios || "-"}</td>
                    <td style={td}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "7px 10px",
                          borderRadius: "999px",
                          color: "white",
                          fontWeight: "900",
                          fontSize: "12px",
                          background: colorEstado(cita.estado),
                        }}
                      >
                        {textoEstado(cita.estado)}
                      </span>
                    </td>
                    <td style={td}>
                      {cita.estado === "confirmada" ? (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() =>
                              actualizarEstado(cita.id, "completada")
                            }
                            style={{
                              background: "#16a34a",
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              fontWeight: "900",
                              cursor: "pointer",
                            }}
                          >
                            ✅ Completar
                          </button>

                          <button
                            onClick={() =>
                              actualizarEstado(cita.id, "cancelada")
                            }
                            style={{
                              background: "#dc2626",
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              fontWeight: "900",
                              cursor: "pointer",
                            }}
                          >
                            🗑 Cancelar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#6b7280", fontWeight: "700" }}>
                          Sin acciones
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {citas.length === 0 && (
            <p style={{ color: "#cbd5e1" }}>No hay citas registradas.</p>
          )}
        </section>
      </main>
    </div>
  );
}
