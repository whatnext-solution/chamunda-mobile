import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const useRedeemMode = () => {
  const [searchParams] = useSearchParams();
  const [isRedeemMode, setIsRedeemMode] = useState(false);

  useEffect(() => {
    const redeemParam = searchParams.get('redeem');
    setIsRedeemMode(redeemParam === 'coins');
  }, [searchParams]);

  return {
    isRedeemMode,
    redeemType: isRedeemMode ? 'coins' : null
  };
};