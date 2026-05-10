import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const GenderCheck = ({onCheckboxChange, selectedGender}) => {
  return (
    <div className='flex gap-6 mt-1 mb-2'>
        <div className='flex items-center space-x-2'>
            <Checkbox 
                id="male"
                checked={selectedGender === 'male'}
                onCheckedChange={() => onCheckboxChange('male')}
            />
            <Label htmlFor="male" className="cursor-pointer text-sm font-medium">Male</Label>
        </div>
        <div className='flex items-center space-x-2'>
            <Checkbox 
                id="female"
                checked={selectedGender === 'female'}
                onCheckedChange={() => onCheckboxChange('female')}
            />
            <Label htmlFor="female" className="cursor-pointer text-sm font-medium">Female</Label>
        </div>
    </div>
  )
}

export default GenderCheck;