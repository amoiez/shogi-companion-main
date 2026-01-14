import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PromotionDialogProps {
  isOpen: boolean;
  piece: string;
  promotedPiece: string;
  onPromote: () => void;
  onDecline: () => void;
}

const PromotionDialog = ({ isOpen, piece, promotedPiece, onPromote, onDecline }: PromotionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-amber-50 border-4 border-amber-800/60">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-amber-900">
            成りますか？
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Show both piece options */}
          <div className="flex items-center justify-center gap-8">
            {/* Original piece */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-18 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <div 
                    className="absolute inset-0 shogi-wedge-piece"
                    style={{
                      clipPath: 'polygon(50% 0%, 95% 15%, 100% 100%, 0% 100%, 5% 15%)',
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center z-10 text-2xl font-bold shogi-piece-text">
                    {piece}
                  </span>
                </div>
              </div>
              <span className="text-sm text-amber-700">現在</span>
            </div>
            
            {/* Arrow */}
            <span className="text-3xl text-amber-600">→</span>
            
            {/* Promoted piece */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-18 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <div 
                    className="absolute inset-0 shogi-wedge-piece bg-gradient-to-b from-red-100 to-red-200"
                    style={{
                      clipPath: 'polygon(50% 0%, 95% 15%, 100% 100%, 0% 100%, 5% 15%)',
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center z-10 text-2xl font-bold text-red-700">
                    {promotedPiece}
                  </span>
                </div>
              </div>
              <span className="text-sm text-red-600">成り</span>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1 py-6 text-lg border-2 border-amber-700/50 hover:bg-amber-100"
            >
              成らない
            </Button>
            <Button
              onClick={onPromote}
              className="flex-1 py-6 text-lg bg-red-600 hover:bg-red-700 text-white"
            >
              成る
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromotionDialog;
