// app/layout.tsx
export const metadata = {
  title: "Réservation de salles — Paroisse Notre Dame du Bon Secours",
  description: "Réservez une salle paroissiale",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f3f4f6" }}>
        {children}
      </body>
    </html>
  );
}
