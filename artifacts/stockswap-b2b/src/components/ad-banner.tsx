export function AdBanner() {
  const adBannerId = import.meta.env.VITE_ADMOB_BANNER_ID;

  if (!adBannerId) {
    return null;
  }

  return (
    <div className="w-full bg-gray-100 border-b border-gray-200 flex flex-col items-center justify-center p-2" data-testid="ad-banner">
      <div className="w-[320px] h-[50px] bg-gray-200 border border-gray-300 border-dashed flex items-center justify-center relative rounded">
        <span className="absolute top-0 left-0 bg-gray-300 text-[10px] px-1 text-gray-600 uppercase rounded-br">Ad</span>
        <span className="text-sm text-gray-500 font-medium tracking-wider">Advertisement</span>
      </div>
    </div>
  );
}
