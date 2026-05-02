const ShimmerLoader = () => (
  <div className="space-y-[16px] p-[24px]">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-[80px] rounded-xl bg-gradient-to-r from-secondary via-card to-secondary bg-[length:200%_100%] animate-shimmer"
      />
    ))}
    <p className="text-center text-sm text-muted-foreground mt-[16px]">Analyzing ingredients...</p>
  </div>
);

export default ShimmerLoader;
