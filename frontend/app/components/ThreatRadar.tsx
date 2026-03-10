export default function ThreatRadar({ threats }: any) {

  if (!threats) return null;

  return (

    <div className="bg-gray-900 p-6 rounded-xl">

      <h2 className="text-xl mb-4">Threat Radar</h2>

      {threats.map((t: any, i: number) => (

        <div key={i} className="mb-2">

          {t.bank}

          <span className="ml-2 text-red-400">
            {t.probability}%
          </span>

        </div>

      ))}

    </div>

  );
}