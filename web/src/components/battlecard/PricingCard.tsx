import SourceChip from './SourceChip';

interface PricingCardProps {
  data: any[];
  onRefresh: () => void;
}

export default function PricingCard({ data, onRefresh }: PricingCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Pricing</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.map((plan, index) => (
            <div key={index} className="border rounded p-3">
              <div className="font-medium mb-2">{plan.value_json?.plan_name || 'Plan'}</div>
              <div className="text-sm text-gray-600 space-y-1">
                {plan.value_json?.monthly_price && (
                  <div>Monthly: ${plan.value_json.monthly_price}</div>
                )}
                {plan.value_json?.annual_price && (
                  <div>Annual: ${plan.value_json.annual_price}</div>
                )}
                {plan.value_json?.unit && (
                  <div>Unit: {plan.value_json.unit}</div>
                )}
                {plan.value_json?.free_trial_days && (
                  <div>Free Trial: {plan.value_json.free_trial_days} days</div>
                )}
                {plan.value_json?.contact_sales && (
                  <div className="text-orange-600">Contact Sales</div>
                )}
              </div>
              {plan.citations && plan.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {plan.citations.map((citation: string, i: number) => (
                    <SourceChip key={i} url={citation} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No pricing data available</p>
      )}
    </div>
  );
}


