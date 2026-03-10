export default function ExecutivePulse() {

  return (

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex justify-between">

      <Metric title="Portfolio NIM" value="4.1%" delta="+0.12%" />
      <Metric title="ROE" value="21.4%" delta="+1.8%" />
      <Metric title="Market Share" value="18.2%" delta="-0.4%" />

    </div>

  );

}

function Metric({title,value,delta}:any){

  return(

    <div>

      <div className="text-slate-400 text-sm">{title}</div>

      <div className="text-3xl font-bold">{value}</div>

      <div className="text-green-400">{delta}</div>

    </div>

  )

}